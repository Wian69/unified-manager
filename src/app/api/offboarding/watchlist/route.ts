import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const WATCHLIST_FILE = path.join(DB_DIR, 'watchlist.json');

// Ensure file exists
if (!fs.existsSync(WATCHLIST_FILE)) {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
    fs.writeFileSync(WATCHLIST_FILE, JSON.stringify([], null, 2));
}

export async function GET() {
    try {
        const data = fs.readFileSync(WATCHLIST_FILE, 'utf-8');
        return NextResponse.json({ watchlist: JSON.parse(data) });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { watchlist } = await req.json();
        fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(watchlist, null, 2));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
