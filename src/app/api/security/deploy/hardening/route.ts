import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const client = getGraphClient();
        
        // 1. Define the Windows Hello for Business Hardening Policy
        // Using the standard windows10GeneralConfiguration model
        const policyPayload = {
            "@odata.type": "#microsoft.graph.windows10GeneralConfiguration",
            "displayName": "Hardened Windows Hello for Business",
            "description": "Enforces 6-char minimum PIN with Uppercase, Lowercase, and Special characters. Requires TPM and enables PIN recovery.",
            "passportForWorkRequired": true,
            "passportForWorkMinimumPinLength": 6,
            "passportForWorkMaximumPinLength": 127,
            "passportForWorkCharactersUppercase": "required",
            "passportForWorkCharactersLowercase": "required",
            "passportForWorkCharactersSpecialCharacters": "required",
            "passportForWorkEnablePinRecovery": true,
            "passportForWorkRequireSecurityDevice": true
        };

        // 2. Create the Policy
        const newPolicy = await client.api('/deviceManagement/deviceConfigurations')
            .post(policyPayload);

        // 3. Assign to All Devices (Virtual Group)
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
        console.error('[API] Deployment failed:', error.message);
        return NextResponse.json(
            { error: "Failed to deploy WHfB Hardening Profile", details: error.message },
            { status: 500 }
        );
    }
}
