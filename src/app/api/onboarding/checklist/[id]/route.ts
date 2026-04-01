import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const userId = params.id;
    try {
        const { data, error } = await supabase
            .from('kv')
            .select('value')
            .eq('key', `onboarding_checklist:${userId}`)
            .maybeSingle();

        if (error) throw error;
        
        return NextResponse.json({ checklist: data?.value || {} }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const userId = params.id;
    try {
        const { checklist } = await request.json();
        const { error } = await supabase
            .from('kv')
            .upsert({ key: `onboarding_checklist:${userId}`, value: checklist }, { onConflict: 'key' });

        if (error) throw error;
        
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
