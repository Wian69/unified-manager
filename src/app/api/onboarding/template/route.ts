import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

// Default Template: Cleaned to remove "Done" labels as per User Request
const DEFAULT_TEMPLATE = [
    { id: 'gen-1', category: 'General', title: 'Add user on 365 admin center', detail: '', checked: true },
    { id: 'gen-2', category: 'General', title: 'Complete Job title', detail: '', checked: false },
    { id: 'gen-3', category: 'General', title: 'Complete Department', detail: '', checked: true },
    { id: 'gen-4', category: 'General', title: 'Complete Office', detail: '', checked: true },
    { id: 'gen-5', category: 'General', title: 'Email Address', detail: '', checked: false },
    { id: 'gen-6', category: 'General', title: 'Add user permissions on Sharepoint', detail: '', checked: true },
    { id: 'gen-7', category: 'General', title: 'Enable local Admin account', detail: '', checked: true },
    { id: 'gen-8', category: 'General', title: 'Add users to Euphoria', detail: '', checked: true },
    { id: 'gen-9', category: 'General', title: 'Euphoria extention number', detail: '', checked: true },
    
    { id: 'enr-1', category: 'Enrollment', title: 'Run Hardware hash', detail: '', checked: true },
    { id: 'enr-2', category: 'Enrollment', title: 'Enroll laptop on autopilot', detail: '', checked: true },
    { id: 'enr-3', category: 'Enrollment', title: 'Laptop Pin', detail: '', checked: false },
    { id: 'enr-4', category: 'Enrollment', title: 'Make sure device is listed in intune', detail: '', checked: true },
    
    { id: 'app-1', category: 'Applications', title: 'Adobe', detail: '', checked: true },
    { id: 'app-2', category: 'Applications', title: 'Java', detail: '', checked: true },
    { id: 'app-3', category: 'Applications', title: 'Company Portal', detail: '', checked: true },
    { id: 'app-4', category: 'Applications', title: 'Microsft 365', detail: '', checked: true },
    { id: 'app-5', category: 'Applications', title: 'Google Chrome', detail: '', checked: true },
    { id: 'app-6', category: 'Applications', title: 'Firefox', detail: '', checked: true },
    { id: 'app-7', category: 'Applications', title: 'Sage', detail: '', checked: true },
    
    { id: 'cfg-1', category: 'Configuration', title: 'Outlook', detail: '', checked: true },
    { id: 'cfg-2', category: 'Configuration', title: 'Outlook signature', detail: '', checked: true },
    { id: 'cfg-3', category: 'Configuration', title: 'Printer - 192.168.3.41', detail: '', checked: true },
    { id: 'cfg-4', category: 'Configuration', title: 'Setup email address on printer', detail: '', checked: true },
    { id: 'cfg-5', category: 'Configuration', title: 'Sync Onedrive', detail: '', checked: true },
    { id: 'cfg-6', category: 'Configuration', title: 'Sync Company Sharepoint', detail: '', checked: true },
    { id: 'cfg-7', category: 'Configuration', title: 'Sync Intune policies', detail: '', checked: true },
    { id: 'cfg-8', category: 'Configuration', title: 'Enable System restore', detail: '', checked: true },
    { id: 'cfg-9', category: 'Configuration', title: 'Add Corporate Background for teams', detail: '', checked: true },
    { id: 'cfg-10', category: 'Configuration', title: 'Make sure keboard is correct (SA)', detail: '', checked: true },
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
