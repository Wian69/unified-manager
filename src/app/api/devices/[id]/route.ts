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

        // 2. Fetch device compliance policies logic (MUST USE BETA for detailed settingStates)
        let complianceStates = [];
        try {
            const cpResponse = await client.api(`/deviceManagement/managedDevices/${id}/deviceCompliancePolicyStates`).version('beta').get();
            complianceStates = cpResponse.value || [];
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
