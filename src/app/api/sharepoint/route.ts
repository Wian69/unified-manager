import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch root site drives (Document Libraries)
        const drivesResponse = await client.api('/sites/root/drives')
            .select('id,name,description,webUrl')
            .get();

        const drives = drivesResponse.value || [];
        // Sort alphabetically by name
        drives.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

        return NextResponse.json({
            drives: drives,
        });
    } catch (error: any) {
        console.error('[API] Graph API Error (SharePoint):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch SharePoint data", details: error.message },
            { status: 500 }
        );
    }
}
