import { NextResponse } from 'next/server';
import { getWatchlist, saveWatchlist } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const watchlist = getWatchlist();
        const client = getGraphClient();
        
        // Enrich watchlist with real-time Drive usage data
        const enrichedWatchlist = [];
        for (const user of watchlist) {
            try {
                // Determine the correct ID to use (prefer UPN if available for drive access)
                const targetId = user.userPrincipalName || user.id;
                const driveRes = await client.api(`/users/${targetId}/drive`).select('quota').get();
                enrichedWatchlist.push({
                    ...user,
                    driveUsed: driveRes.quota?.used || 0
                });
            } catch (err: any) {
                console.error(`[Watchlist] Drive fetch failed for ${user.userPrincipalName}:`, err.message);
                // Fallback to 0
                enrichedWatchlist.push({ ...user, driveUsed: 0 });
            }
        }

        return NextResponse.json({ watchlist: enrichedWatchlist });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { watchlist } = await req.json();
        console.log(`[Watchlist API] Received ${watchlist?.length || 0} users for persistence.`);
        saveWatchlist(watchlist || []);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
