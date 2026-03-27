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

        // 1. Fetch recent items from the user's drive
        // This includes created, modified, and seen items.
        // It's a high-level view of what's being touched.
        const recentResponse = await client.api(`/users/${userId}/drive/recent`)
            .top(100)
            .get();

        const recentItems = recentResponse.value || [];

        // 2. Fetch recent "Activities" (if available via Graph beta)
        // This can provide more granular event types like 'downloaded', 'moved', etc.
        let activities: any[] = [];
        try {
            const actResponse = await client.api(`/users/${userId}/activities`)
                .top(50)
                .get();
            activities = actResponse.value || [];
        } catch (e) {
            console.warn('[API] Activities fetch failed, skipping.');
        }

        // 3. Heuristic for "Mass Activity"
        // If many items were modified or accessed in the last hour, flag it.
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const suspiciousEventCount = recentItems.filter((item: any) => {
            const modTime = item.lastModifiedDateTime || item.remoteItem?.lastModifiedDateTime;
            return modTime && modTime >= oneHourAgo;
        }).length;

        return NextResponse.json({
            recentActivity: recentItems.map((item: any) => ({
                id: item.id,
                name: item.name,
                webUrl: item.webUrl,
                lastModified: item.lastModifiedDateTime,
                remote: !!item.remoteItem
            })),
            activities,
            stats: {
                lastHourEventCount: suspiciousEventCount,
                intensity: suspiciousEventCount > 20 ? 'high' : suspiciousEventCount > 5 ? 'medium' : 'low'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[API] Activity Audit Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch activity audit", details: error.message },
            { status: 500 }
        );
    }
}
