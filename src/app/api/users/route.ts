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

        // Sort alphabetically by displayName before presence fetch
        users.sort((a: any, b: any) => (a.displayName || '').localeCompare(b.displayName || ''));

        // Batch fetch presences (up to 650 users supported by this endpoint)
        const userIds = users.map(u => u.id);
        let usersWithPresence = users;
        
        if (userIds.length > 0) {
            try {
                // Presence.Read.All required
                const presenceResponse = await client.api('/communications/getPresencesByUserId')
                    .post({ ids: userIds });
                
                const presences = presenceResponse.value || [];
                const presenceMap = new Map(presences.map((p: any) => [p.id, p]));
                
                usersWithPresence = users.map(u => ({
                    ...u,
                    presence: presenceMap.get(u.id) || null
                }));
            } catch (error: any) {
                console.warn('[API] Presence batch fetch failed:', error.message);
                // Continue without presence rather than failing the whole user list
            }
        }

        return new NextResponse(JSON.stringify({
            users: usersWithPresence,
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
