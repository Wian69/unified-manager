import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // 1. Fetch ALL Standard Device Configuration Profiles
        const standardResponse = await client.api('/deviceManagement/deviceConfigurations').get();

        // 2. Fetch ALL Endpoint Security Configuration Policies
        let endpointResponse;
        try {
            endpointResponse = await client.api('/deviceManagement/configurationPolicies').get();
        } catch (e) {
            endpointResponse = { value: [] };
        }

        return NextResponse.json({
            standard: standardResponse.value || [],
            endpoint: endpointResponse.value || []
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
