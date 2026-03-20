import { NextResponse } from 'next/server';
import { getWatchlist, saveWatchlist } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const logFile = 'C:\\Users\\WianDuRandt\\.gemini\\antigravity\\scratch\\unified-manager\\debug_api.log';
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] GET Watchlist Request Received\n`);
        const watchlist = getWatchlist();
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] Loaded ${watchlist.length} users from disk\n`);
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
        const logFile = 'C:\\Users\\WianDuRandt\\.gemini\\antigravity\\scratch\\unified-manager\\debug_api.log';
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] POST Watchlist Received: ${watchlist?.length || 0} users\n`);
        saveWatchlist(watchlist || []);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
