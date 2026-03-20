import { NextResponse } from 'next/server';
import { getWatchlist, saveWatchlist } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const watchlist = getWatchlist();
        return NextResponse.json({ watchlist });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { watchlist } = await req.json();
        saveWatchlist(watchlist);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
