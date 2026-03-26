import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const client = getGraphClient();
        
        // 1. Fetch main device details
        const deviceResponse = await client.api(`/deviceManagement/managedDevices/${id}`)
            .select('id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,serialNumber,manufacturer,model,userPrincipalName,userDisplayName,enrolledDateTime,isEncrypted,jailBroken,wifiMacAddress,ethernetMacAddress,totalStorageSpaceInBytes,freeStorageSpaceInBytes')
            .get();

        // 2. Fetch device compliance policies (Attempt expansion and error capture)
        let complianceStates = [];
        try {
            const cpResponse = await client.api(`/deviceManagement/managedDevices/${id}/deviceCompliancePolicyStates`)
                .version('beta')
                .expand('settingStates')
                // Capture errorCode and errorDescription which often contain the reason if settingStates is empty
                .select('id,displayName,state,settingCount,errorCode,errorDescription,settingStates')
                .get();
            complianceStates = cpResponse.value || [];

            // FALLBACK: If settingStates are missing for a non-compliant policy, fetch them individually
            for (let i = 0; i < complianceStates.length; i++) {
                const p = complianceStates[i];
                if (p.state !== 'compliant' && (!p.settingStates || p.settingStates.length === 0)) {
                    try {
                        const settings = await client.api(`/deviceManagement/managedDevices/${id}/deviceCompliancePolicyStates/${p.id}/settingStates`).version('beta').get();
                        complianceStates[i].settingStates = settings.value || [];
                    } catch (sErr) {
                        console.warn(`[API] Follow-up fetch failed for policy ${p.id}:`, sErr);
                    }
                }
            }
        } catch (e) {
            console.warn('[API] Could not fetch compliance states for device:', id);
        }

        // 3. Fetch device configuration states
        let configStates = [];
        try {
            const cfgResponse = await client.api(`/deviceManagement/managedDevices/${id}/deviceConfigurationStates`).get();
            configStates = cfgResponse.value || [];
        } catch (e) {
            console.warn('[API] Could not fetch configuration states for device:', id);
        }

        return NextResponse.json({
            device: deviceResponse,
            compliancePolicies: complianceStates,
            configurationPolicies: configStates
        });

    } catch (error: any) {
        console.error('[API] Graph API Error (Get Device):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch device details", details: error.message },
            { status: 500 }
        );
    }
}
