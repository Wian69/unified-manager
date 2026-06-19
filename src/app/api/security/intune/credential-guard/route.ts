import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // 1. Fetch Standard Device Configuration Profiles
        const response = await client.api('/deviceManagement/deviceConfigurations')
            .filter("contains(displayName, 'Credential') or contains(displayName, 'Security') or contains(displayName, 'Endpoint') or contains(displayName, 'Hello')")
            .get();

        // 2. Fetch Endpoint Security Configuration Policies (where Account Protection lives)
        let endpointSecurityResponse;
        try {
            endpointSecurityResponse = await client.api('/deviceManagement/configurationPolicies')
                .filter("contains(name, 'Credential') or contains(name, 'Security') or contains(name, 'Endpoint') or contains(name, 'Hello') or contains(name, 'Account')")
                .get();
        } catch (e) {
            console.warn('[API] configurationPolicies endpoint not accessible:', e);
            endpointSecurityResponse = { value: [] };
        }

        const standardConfigs = response.value || [];
        const endpointConfigs = endpointSecurityResponse.value || [];
        
        // Merge them for analysis
        const allConfigs = [
            ...standardConfigs.map((c: any) => ({ name: c.displayName, id: c.id, source: 'Standard' })),
            ...endpointConfigs.map((c: any) => ({ name: c.name, id: c.id, source: 'EndpointSecurity' }))
        ];
        
        const credentialGuardConfigs = allConfigs.filter((c: any) => 
            c.name.toLowerCase().includes('credential') || 
            c.name.toLowerCase().includes('security') ||
            c.name.toLowerCase().includes('account')
        );

        const windowsHelloConfigs = allConfigs.filter((c: any) => 
            c.name.toLowerCase().includes('hello') ||
            c.name.toLowerCase().includes('pin')
        );

        return NextResponse.json({
            credentialGuard: {
                isConfigured: credentialGuardConfigs.length > 0,
                profiles: credentialGuardConfigs
            },
            windowsHello: {
                isConfigured: windowsHelloConfigs.length > 0,
                profiles: windowsHelloConfigs
            }
        });
    } catch (error: any) {
        console.error('[API] Credential Guard check failed:', error.message);
        return NextResponse.json(
            { error: "Failed to check Credential Guard status", details: error.message },
            { status: 500 }
        );
    }
}
