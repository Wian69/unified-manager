import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // 1. Fetch Organization settings for password policy
        const orgResponse = await client.api('/organization').get();
        const org = orgResponse.value[0];

        // 2. Fetch Password Validity Period
        // This is typically in the 'passwordPolicies' property
        const passwordPolicy = org.passwordPolicies;

        return NextResponse.json({
            organization: org.displayName,
            passwordPolicies: passwordPolicy || "None (Default)",
            isSetToNeverExpire: passwordPolicy === 'DisablePasswordExpiration'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
