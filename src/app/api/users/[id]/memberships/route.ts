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

        // 3. Targeted Restricted Folder Discovery (New)
        let restrictedItems = [];
        if (searchKeywords) {
            const keywords = searchKeywords.split(',').map(k => k.trim()).filter(Boolean);
            
            for (const keyword of keywords) {
                try {
                    const searchRes = await client.api('/search/query').post({
                        requests: [{
                            entityTypes: ['driveItem'],
                            query: { queryString: `"${keyword}"` },
                            from: 0,
                            size: 25
                        }]
                    });

                    const hits = searchRes.value?.[0]?.hitsContainers?.[0]?.hits || [];
                    
                    for (const hit of hits) {
                        const item = hit.resource;
                        if (!item.id || !item.parentReference?.driveId) continue;

                        // Deep check permissions for this specific item
                        try {
                            const perms = await client.api(`/drives/${item.parentReference.driveId}/items/${item.id}/permissions`).get();
                            const hasAccess = perms.value?.some((p: any) => {
                                // Check if user ID or any of their groups are in the permissions
                                const grantee = p.grantedToV2 || p.grantedTo;
                                if (!grantee) return false;
                                
                                const targetId = grantee.user?.id || grantee.group?.id || grantee.siteGroup?.id;
                                return targetId === id || groupIds.includes(targetId);
                            });

                            if (hasAccess) {
                                // Filter out if already in sharedItems to avoid duplicates
                                if (!sharedItems.some((si: any) => si.id === item.id)) {
                                    restrictedItems.push({
                                        name: item.name,
                                        id: item.id,
                                        webUrl: item.webUrl,
                                        isFolder: !!item.folder,
                                        role: 'Discovered Access',
                                        isRestricted: true
                                    });
                                }
                            }
                        } catch (pErr) {
                            // Site might be too restricted to even read permissions
                        }
                    }
                } catch (sErr) {
                    console.error(`[API] Search error for ${keyword}:`, sErr);
                }
            }
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
