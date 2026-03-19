import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        let allGroups: any[] = [];
        let response = await client.api('/groups')
            .select('id,displayName,description,groupTypes,securityEnabled')
            .top(999)
            .get();
            
        allGroups = allGroups.concat(response.value || []);
        
        while (response['@odata.nextLink']) {
            response = await client.api(response['@odata.nextLink']).get();
            allGroups = allGroups.concat(response.value || []);
        }

        // Filter for security groups or M365 groups that can be targeted
        const groups = allGroups.sort((a: any, b: any) => (a.displayName || '').localeCompare(b.displayName || ''));

        return NextResponse.json({ groups });
    } catch (error: any) {
        console.error('[API] Graph API Error (Groups):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch groups", details: error.message },
            { status: 500 }
        );
    }
}
