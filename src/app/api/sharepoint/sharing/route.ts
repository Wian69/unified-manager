import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    try {
        const client = getGraphClient();

        // 1. Get user's personal drive
        const drive = await client.api(`/users/${userId}/drive`).get();
        const driveId = drive.id;

        // 2. Fetch items with permissions expanded
        // We focus on the root children first for performance. 
        // In a real scenario, we might want to recurse or use search.
        const response = await client.api(`/drives/${driveId}/root/children`)
            .expand('permissions')
            .select('id,name,webUrl,permissions,folder,file')
            .get();

        const items = response.value || [];
        const externalItems = items.filter((item: any) => {
            if (!item.permissions) return false;
            return item.permissions.some((p: any) => {
                // Check for external link or specific external user
                if (p.link && p.link.scope === 'anonymous') return true;
                if (p.link && p.link.scope === 'organization') return false; // Org-wide is usually okay, but could be flagged depending on policy
                
                // Identify specific external invitees
                if (p.invitation && p.grantedToIdentitiesV2) {
                    return p.grantedToIdentitiesV2.some((id: any) => {
                        const email = id.user?.email || id.user?.userPrincipalName;
                        return email && !email.toLowerCase().endsWith('@' + drive.driveType); // Very basic check
                    });
                }
                return false;
            });
        }).map((item: any) => ({
            id: item.id,
            name: item.name,
            webUrl: item.webUrl,
            type: item.folder ? 'folder' : 'file',
            permissions: item.permissions.filter((p: any) => p.link?.scope === 'anonymous' || p.invitation)
        }));

        return NextResponse.json({
            data: externalItems,
            scanDepth: "Root Only (High Performance)",
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[API] Sharing Audit Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch sharing audit", details: error.message },
            { status: 500 }
        );
    }
}
