import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
    if (!supabase) {
        supabase = createClient(
            process.env.SUPABASE_URL || 'http://localhost:54321', // Dummy URL to prevent crash on build
            process.env.SUPABASE_ANON_KEY || 'dummy'
        );
    }
    return supabase;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: userId } = await params;
    try {
        const { data, error } = await getSupabase()
            .from('kv')
            .select('value')
            .eq('key', `onboarding_checklist:${userId}`)
            .maybeSingle();

        if (error) throw error;
        
        const row = data as any;
        return NextResponse.json({ checklist: row?.value || {} }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: userId } = await params;
    try {
        const { checklist } = await request.json();
        const { error } = await getSupabase()
            .from('kv')
            .upsert({ key: `onboarding_checklist:${userId}`, value: checklist }, { onConflict: 'key' });

        if (error) throw error;
        
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
