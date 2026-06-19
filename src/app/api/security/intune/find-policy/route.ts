import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Try to fetch from multiple possible locations for modern Intune policies
        const endpoints = [
            { path: '/deviceManagement/deviceConfigurations', version: 'v1.0' },
            { path: '/deviceManagement/deviceCompliancePolicies', version: 'v1.0' },
            { path: '/deviceManagement/configurationPolicies', version: 'beta' },
            { path: '/deviceManagement/securityBaselines', version: 'beta' }
        ];

        const results: any = {};

        for (const endpoint of endpoints) {
            try {
                const res = await client.api(endpoint.path).version(endpoint.version).get();
                results[endpoint.path.split('/').pop()!] = res.value || [];
            } catch (e) {
                results[endpoint.path.split('/').pop()!] = { error: "Not found or restricted" };
            }
        }

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
