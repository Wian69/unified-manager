import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const client = getGraphClient();

        // 1. Fetch Group Memberships (Transitive)
        const groupsResponse = await client.api(`/users/${id}/transitiveMemberOf`)
            .select('id,displayName,description,mail,groupTypes,securityEnabled')
            .top(999)
            .get();

        const allMemberships = groupsResponse.value || [];
        
        // Categorize into Directory Roles vs Groups
        const groups: any[] = [];
        const directoryRoles: any[] = [];

        allMemberships.forEach((m: any) => {
            // Directory roles usually have @odata.type "#microsoft.graph.directoryRole" 
            // but we can also check for missing groupTypes and securityEnabled in some cases
            if (!m.groupTypes && m.securityEnabled === undefined) {
                directoryRoles.push(m);
            } else {
                groups.push(m);
            }
        });

        // 2. Fetch Shared Items (OneDrive / SharePoint)
        let sharedItems = [];
        try {
            // Adding select to get more metadata if available
            const sharedRes = await client.api(`/users/${id}/drive/sharedWithMe`)
                .expand('permissions') // Try to get permission roles
                .get();
            
            sharedItems = (sharedRes.value || []).map((item: any) => {
                // Extract role (e.g., read, write, owner) from remoteItem.permissions or sharingReference
                let role = 'Contributor'; // Default
                const remote = item.remoteItem;
                
                if (remote?.shared?.scope === 'anonymous') role = 'Public';
                
                // Try to find specific roles
                if (remote?.permissions && remote.permissions.length > 0) {
                    role = remote.permissions[0].roles?.join(', ') || role;
                }

                return {
                    name: item.name,
                    id: item.id,
                    webUrl: item.webUrl || remote?.webUrl,
                    isFolder: !!item.folder || !!remote?.folder,
                    sharedBy: remote?.sharedBy?.user?.displayName || 'Unknown',
                    sharedDateTime: remote?.shared?.sharedDateTime,
                    role: role
                };
            });
        } catch (e) {
            console.warn(`[API] Could not fetch shared items for ${id}:`, e);
        }

        return NextResponse.json({
            success: true,
            groups,
            directoryRoles,
            sharedItems
        });
    } catch (error: any) {
        console.error('[API] Memberships Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch memberships", details: error.message },
            { status: 500 }
        );
    }
}
