import { NextResponse } from 'next/server';
import { getGlobalSettings, saveGlobalSettings } from '@/lib/db';

export async function GET() {
    try {
        const settings = await getGlobalSettings();
        return NextResponse.json(settings);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const settings = await getGlobalSettings();
        const newSettings = { ...settings, ...data };
        await saveGlobalSettings(newSettings);
        return NextResponse.json({ success: true, settings: newSettings });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
