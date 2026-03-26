import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const rawUrl = process.env.STORAGE_URL || process.env.KV_URL || "";
    const isKv = rawUrl.startsWith('https://') && !!(process.env.STORAGE_REST_API_TOKEN || process.env.KV_REST_API_TOKEN);
    const isSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;
    const isVercel = process.env.VERCEL === '1';

    return NextResponse.json({
        diagnostics: {
            environment: isVercel ? 'Vercel' : 'Local',
            kvConnected: isKv,
            supabaseConnected: isSupabase,
            usingPrefix: process.env.STORAGE_URL ? 'STORAGE' : 'KV',
            activeStorage: isSupabase ? 'Supabase' : (isKv ? 'Vercel KV' : 'Volatile Memory'),
        }
    });
}
