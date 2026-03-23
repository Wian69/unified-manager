import { NextResponse } from 'next/server';
import { getWatchlist, saveWatchlist } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const logFile = 'C:\\Users\\WianDuRandt\\.gemini\\antigravity\\scratch\\unified-manager\\debug_api.log';
        const watchlist = getWatchlist();
        
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] GET Watchlist: Found ${watchlist.length} users\n`);
        
        const client = getGraphClient();
        
        // Enrich watchlist with real-time Drive usage data
        const enrichedWatchlist = [];
        for (const user of watchlist) {
            try {
                // Determine the correct ID to use (prefer UPN if available for drive access)
                const targetId = user.userPrincipalName || user.id;
                const driveRes = await client.api(`/users/${targetId}/drive`).select('quota,webUrl').get();
                
                const driveUsed = driveRes.quota?.used || 0;
                enrichedWatchlist.push({
                    ...user,
                    driveUsed: driveUsed,
                    oneDriveUrl: driveRes.webUrl
                });
            } catch (err: any) {
                console.error(`[Watchlist] Drive fetch failed for ${user.userPrincipalName}:`, err.message);
                // Fallback to 0 but log it
                enrichedWatchlist.push({ ...user, driveUsed: 0, oneDriveUrl: null });
            }
        }

        return NextResponse.json({ watchlist: enrichedWatchlist });
    } catch (error: any) {
        console.error('[Watchlist GET Error]:', error);
        return NextResponse.json({ error: error.message, watchlist: [] }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const logFile = 'C:\\Users\\WianDuRandt\\.gemini\\antigravity\\scratch\\unified-manager\\debug_api.log';
    try {
        const { watchlist } = await req.json();
        if (!Array.isArray(watchlist)) {
            throw new Error('Watchlist must be an array');
        }
        
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] POST Watchlist Received: ${watchlist.length} users\n`);
        
        saveWatchlist(watchlist);
        
        // Verify write
        const verified = getWatchlist();
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] Verification: ${verified.length} users saved to disk\n`);
        
        return NextResponse.json({ success: true, count: verified.length });
    } catch (error: any) {
        console.error('[Watchlist POST Error]:', error);
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] FATAL POST Error: ${error.message}\n`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
