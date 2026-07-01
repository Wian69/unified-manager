import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const { searchParams } = new URL(request.url);
        const searchKeywords = searchParams.get('search');
        const client = getGraphClient();

        // 1. Fetch Group Memberships (Transitive)
        const groupsResponse = await client.api(`/users/${id}/transitiveMemberOf`)
            .select('id,displayName,description,mail,groupTypes,securityEnabled')
            .top(999)
            .get();

        const allMemberships = groupsResponse.value || [];
        const groupIds = allMemberships.map((m: any) => m.id);
        
        // Categorize into Directory Roles vs Groups
        const groups: any[] = [];
        const directoryRoles: any[] = [];

        allMemberships.forEach((m: any) => {
            if (!m.groupTypes && m.securityEnabled === undefined) {
                directoryRoles.push(m);
            } else {
                groups.push(m);
            }
        });

        // 2. Fetch Shared Items (OneDrive / SharePoint)
        let sharedItems = [];
        try {
            const sharedRes = await client.api(`/users/${id}/drive/sharedWithMe`)
                .expand('permissions')
                .get();
            
            sharedItems = (sharedRes.value || []).map((item: any) => {
                let role = 'Contributor';
                let permissionId = null;
                const remote = item.remoteItem;
                if (remote?.shared?.scope === 'anonymous') role = 'Public';
                if (remote?.permissions && remote.permissions.length > 0) {
                    role = remote.permissions[0].roles?.join(', ') || role;
                    permissionId = remote.permissions[0].id;
                }

                return {
                    name: item.name,
                    id: item.id,
                    driveId: remote?.parentReference?.driveId,
                    permissionId: permissionId,
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

        // Fetch Followed Sites
        try {
            const followedRes = await client.api(`/users/${id}/sites/followed`).get();
            const followedSites = followedRes.value || [];
            for (const site of followedSites) {
                sharedItems.push({
                    name: site.displayName,
                    id: site.id,
                    webUrl: site.webUrl,
                    isFolder: true,
                    role: 'Followed Site Member',
                    sharedBy: 'SharePoint Site'
                });
            }
        } catch (e) {
            console.warn(`[API] Could not fetch followed sites for ${id}:`, e);
        }

        // Fetch Recent Activity (Folders Only)
        try {
            const recentRes = await client.api(`/users/${id}/drive/recent`).get();
            const recentFolders = (recentRes.value || []).filter((i: any) => !!i.folder);
            const discoveredFolderIds = new Set(sharedItems.map((si: any) => si.id));
            
            for (const rf of recentFolders) {
                if (!discoveredFolderIds.has(rf.id)) {
                    sharedItems.push({
                        name: rf.name,
                        id: rf.id,
                        webUrl: rf.webUrl,
                        isFolder: true,
                        role: 'Recent Folder Access',
                        sharedBy: 'SharePoint Discovery'
                    });
                    discoveredFolderIds.add(rf.id);
                }
            }
        } catch (e) {
            console.warn(`[API] Could not fetch recent folders for ${id}:`, e);
        }

        return NextResponse.json({
            success: true,
            groups,
            directoryRoles,
            sharedItems,
            restrictedItems: [] // Keeping empty array to not break frontend before it is updated
        });
    } catch (error: any) {
        console.error('[API] Memberships Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch memberships", details: error.message },
            { status: 500 }
        );
    }
}
