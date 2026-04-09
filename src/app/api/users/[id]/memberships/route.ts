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
                const remote = item.remoteItem;
                if (remote?.shared?.scope === 'anonymous') role = 'Public';
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

        // 3. Targeted Restricted Folder Discovery & Auto-Discovery
        let restrictedItems: any[] = [];
        const discoveredFolderIds = new Set(sharedItems.map((si: any) => si.id));

        // AUTO-DISCOVERY PHASE (without manual searching)
        
        // A. Fetch Followed Sites
        try {
            const followedRes = await client.api(`/users/${id}/sites/followed`).get();
            const followedSites = followedRes.value || [];
            for (const site of followedSites) {
                restrictedItems.push({
                    name: site.displayName,
                    id: site.id,
                    webUrl: site.webUrl,
                    isFolder: true,
                    role: 'Followed Site',
                    isRestricted: false
                });
            }
        } catch (e) {}

        // B. Fetch Recent Activity (Folders Only)
        try {
            const recentRes = await client.api(`/users/${id}/drive/recent`).get();
            const recentFolders = (recentRes.value || []).filter((i: any) => !!i.folder);
            for (const rf of recentFolders) {
                if (!discoveredFolderIds.has(rf.id)) {
                    restrictedItems.push({
                        name: rf.name,
                        id: rf.id,
                        webUrl: rf.webUrl,
                        isFolder: true,
                        role: 'Recent Access',
                        isRestricted: false
                    });
                    discoveredFolderIds.add(rf.id);
                }
            }
        } catch (e) {}

        // C. Wildcard Pattern Scan (Automatically find folders matching sensitive patterns)
        const autoKeywords = searchKeywords ? searchKeywords.split(',').map(k => k.trim()) : ['Finance', 'Management', 'Legal', 'HR', 'Executive', 'Salaries'];
        
        for (const keyword of autoKeywords) {
            if (!keyword) continue;
            try {
                const searchRes = await client.api('/search/query').post({
                    requests: [{
                        entityTypes: ['driveItem'],
                        query: { queryString: `"${keyword}" isDocument:false` },
                        from: 0,
                        size: 15
                    }]
                });

                const hits = searchRes.value?.[0]?.hitsContainers?.[0]?.hits || [];
                
                for (const hit of hits) {
                    const item = hit.resource;
                    if (!item.id || !item.parentReference?.driveId || discoveredFolderIds.has(item.id)) continue;

                    try {
                        const perms = await client.api(`/drives/${item.parentReference.driveId}/items/${item.id}/permissions`).get();
                        const hasAccess = perms.value?.some((p: any) => {
                            const grantee = p.grantedToV2 || p.grantedTo;
                            if (!grantee) return false;
                            const targetId = grantee.user?.id || grantee.group?.id || grantee.siteGroup?.id;
                            return targetId === id || groupIds.includes(targetId);
                        });

                        if (hasAccess) {
                            restrictedItems.push({
                                name: item.name,
                                id: item.id,
                                webUrl: item.webUrl,
                                isFolder: true,
                                role: 'Discovery Match',
                                isRestricted: true
                            });
                            discoveredFolderIds.add(item.id);
                        }
                    } catch (pErr) {}
                }
            } catch (sErr) {}
        }

        return NextResponse.json({
            success: true,
            groups,
            directoryRoles,
            sharedItems,
            restrictedItems
        });
    } catch (error: any) {
        console.error('[API] Memberships Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch memberships", details: error.message },
            { status: 500 }
        );
    }
}
