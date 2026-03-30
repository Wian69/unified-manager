import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || "";
    try {
        const client = getGraphClient();
        
        let allUsers: any[] = [];
        let response = await client.api('/users')
            .select('id,displayName,userPrincipalName,jobTitle,department,officeLocation,accountEnabled,signInActivity')
            .top(999)
            .get();
            
        allUsers = allUsers.concat(response.value || []);
        
        while (response['@odata.nextLink']) {
            response = await client.api(response['@odata.nextLink']).get();
            allUsers = allUsers.concat(response.value || []);
        }

        let users = allUsers;

        if (search) {
            users = users.filter((u: any) => 
                (u.displayName || '').toLowerCase().includes(search) || 
                (u.userPrincipalName || '').toLowerCase().includes(search)
            );
        }

        // Sort alphabetically by displayName
        users.sort((a: any, b: any) => (a.displayName || '').localeCompare(b.displayName || ''));

        return new NextResponse(JSON.stringify({
            users: users,
            activeUsers: users.filter((u: any) => u.accountEnabled).length,
        }), {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
                'Content-Type': 'application/json',
            }
        });
    } catch (error: any) {
        console.error('[API] Graph API Error (Users):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch users", details: error.message },
            { status: 500 }
        );
    }
}
