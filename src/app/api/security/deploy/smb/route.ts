import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const client = getGraphClient();
        
        // Define the SMB Hardening Policy using Custom OMA-URI
        const policyPayload = {
            "@odata.type": "#microsoft.graph.windows10CustomConfiguration",
            "displayName": "SMB Server Hardening (OMA-URI)",
            "description": "Enforces mandatory SMB Signing and Encryption to prevent relay attacks.",
            "omaSettings": [
                {
                    "@odata.type": "#microsoft.graph.omaSettingInteger",
                    "displayName": "Require SMB Signing (Server)",
                    "omaUri": "./Device/Vendor/MSFT/Policy/Config/LanmanServer/RequireSecuritySignature",
                    "value": 1
                },
                {
                    "@odata.type": "#microsoft.graph.omaSettingInteger",
                    "displayName": "Require SMB Signing (Client)",
                    "omaUri": "./Device/Vendor/MSFT/Policy/Config/LanmanWorkstation/RequireSecuritySignature",
                    "value": 1
                },
                {
                    "@odata.type": "#microsoft.graph.omaSettingInteger",
                    "displayName": "Enable SMB Encryption",
                    "omaUri": "./Device/Vendor/MSFT/Policy/Config/LanmanServer/EncryptData",
                    "value": 1
                }
            ]
        };

        // 1. Create the Policy
        const newPolicy = await client.api('/deviceManagement/deviceConfigurations')
            .post(policyPayload);

        // 2. Assign to All Devices
        const assignmentPayload = {
            "assignments": [
                {
                    "target": {
                        "@odata.type": "#microsoft.graph.allDevicesAssignmentTarget"
                    }
                }
            ]
        };

        await client.api(`/deviceManagement/deviceConfigurations/${newPolicy.id}/assign`)
            .post(assignmentPayload);

        return NextResponse.json({
            success: true,
            policyName: newPolicy.displayName,
            policyId: newPolicy.id,
            assignedTo: "All Devices"
        });

    } catch (error: any) {
        console.error('[API] SMB Deployment failed:', error.message);
        return NextResponse.json(
            { error: "Failed to deploy SMB Hardening Profile", details: error.message },
            { status: 500 }
        );
    }
}
