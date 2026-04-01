import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

const DEFAULT_TEMPLATE = [
    { id: 'gen-1', category: 'General', title: 'Add user on 365 admin center', detail: 'Done', checked: true },
    { id: 'gen-2', category: 'General', title: 'Complete Job title', detail: '', checked: false },
    { id: 'gen-3', category: 'General', title: 'Complete Department', detail: 'Done', checked: true },
    { id: 'gen-4', category: 'General', title: 'Complete Office', detail: 'Done', checked: true },
    { id: 'gen-5', category: 'General', title: 'Email Address', detail: '', checked: false },
    { id: 'gen-6', category: 'General', title: 'Add user permissions on Sharepoint', detail: 'Done', checked: true },
    { id: 'gen-7', category: 'General', title: 'Enable local Admin account', detail: 'Done', checked: true },
    { id: 'gen-8', category: 'General', title: 'Add users to Euphoria', detail: 'Done', checked: true },
    { id: 'gen-9', category: 'General', title: 'Euphoria extention number', detail: 'Done', checked: true },
    
    { id: 'enr-1', category: 'Enrollment', title: 'Run Hardware hash', detail: 'Done', checked: true },
    { id: 'enr-2', category: 'Enrollment', title: 'Enroll laptop on autopilot', detail: 'Done', checked: true },
    { id: 'enr-3', category: 'Enrollment', title: 'Laptop Pin', detail: '', checked: false },
    { id: 'enr-4', category: 'Enrollment', title: 'Make sure device is listed in intune', detail: 'Done', checked: true },
    
    { id: 'app-1', category: 'Applications', title: 'Adobe', detail: 'Done', checked: true },
    { id: 'app-2', category: 'Applications', title: 'Java', detail: 'Done', checked: true },
    { id: 'app-3', category: 'Applications', title: 'Company Portal', detail: 'Done', checked: true },
    { id: 'app-4', category: 'Applications', title: 'Microsft 365', detail: 'Done', checked: true },
    { id: 'app-5', category: 'Applications', title: 'Google Chrome', detail: 'Done', checked: true },
    { id: 'app-6', category: 'Applications', title: 'Firefox', detail: 'Done', checked: true },
    { id: 'app-7', category: 'Applications', title: 'Sage', detail: 'N/A', checked: true },
    
    { id: 'cfg-1', category: 'Configuration', title: 'Outlook', detail: 'Done', checked: true },
    { id: 'cfg-2', category: 'Configuration', title: 'Outlook signature', detail: 'Done', checked: true },
    { id: 'cfg-3', category: 'Configuration', title: 'Printer - 192.168.3.41', detail: 'Done', checked: true },
    { id: 'cfg-4', category: 'Configuration', title: 'Setup email address on printer', detail: 'Done', checked: true },
    { id: 'cfg-5', category: 'Configuration', title: 'Sync Onedrive', detail: 'Done', checked: true },
    { id: 'cfg-6', category: 'Configuration', title: 'Sync Company Sharepoint', detail: 'Done', checked: true },
    { id: 'cfg-7', category: 'Configuration', title: 'Sync Intune policies', detail: 'Done', checked: true },
    { id: 'cfg-8', category: 'Configuration', title: 'Enable System restore', detail: 'Done', checked: true },
    { id: 'cfg-9', category: 'Configuration', title: 'Add Corporate Background for teams', detail: 'Done', checked: true },
    { id: 'cfg-10', category: 'Configuration', title: 'Make sure keboard is correct (SA)', detail: 'Done', checked: true },
    { id: 'cfg-11', category: 'Configuration', title: 'Add to intune Group', detail: '', checked: false },
];

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('kv')
            .select('value')
            .eq('key', 'onboarding_template')
            .maybeSingle();

        if (error) throw error;
        
        return NextResponse.json({ template: data?.value || DEFAULT_TEMPLATE }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { template } = await request.json();
        const { error } = await supabase
            .from('kv')
            .upsert({ key: 'onboarding_template', value: template }, { onConflict: 'key' });

        if (error) throw error;
        
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
