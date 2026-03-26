import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const client = getGraphClient();

        // 1. Remediation Script Content (Base64)
        const remediationScript = `# Windows Update & Vulnerability Remediation Script (Auto-Generated)
Write-Output "Starting Global Remediation Pulse..."
try {
    Start-Process -FilePath "usoclient.exe" -ArgumentList "StartInteractiveScan" -Wait
    Update-MpSignature
    Start-MpScan -ScanType QuickScan
    Get-Service -Name "WinDefend", "Wuauserv", "MpsSvc" | Where-Object { $_.Status -ne 'Running' } | Start-Service
    Write-Output "Remediation Success."
} catch {
    Write-Output "Error: $_"
}
`;

        const encodedScript = Buffer.from(remediationScript).toString('base64');

        // 2. Create the Device Management Script in Intune
        const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
        const scriptPayload = {
            displayName: `Remediation_Pulse_${timestamp}`,
            description: "Automated vulnerability and update remediation (One-Touch)",
            scriptContent: encodedScript,
            runAsAccount: "system",
            enforceSignatureCheck: false,
            runAs32Bit: false,
            retryCount: 3,
            blockExecutionNotifications: true,
            executionFrequency: "PT0S" // Run once
        };

        const createdScript = await client.api('/deviceManagement/deviceManagementScripts').post(scriptPayload);
        const scriptId = createdScript.id;

        // 3. Assign to All Devices (Global Assignment)
        const assignmentPayload = {
            assignments: [
                {
                    target: {
                        "@odata.type": "#microsoft.graph.allDevicesAssignmentTarget"
                    }
                }
            ]
        };

        await client.api(`/deviceManagement/deviceManagementScripts/${scriptId}/assign`).post(assignmentPayload);

        // 4. Trigger Bulk Sync (Immediate Impact)
        // Fetch all managed device IDs to sync
        const devices = await client.api('/deviceManagement/managedDevices').select('id,deviceName').get();
        const deviceIds = devices.value.map((d: any) => d.id);

        // We can't trigger all at once in one request easily, so we loop or use bulk action if available
        // For simplicity and immediate feedback, we trigger for the first 50 to avoid timeouts
        const triggerSyncs = deviceIds.slice(0, 50).map((id: string) => 
            client.api(`/deviceManagement/managedDevices/${id}/syncDevice`).post({})
        );

        await Promise.allSettled(triggerSyncs);

        return NextResponse.json({
            success: true,
            message: "Remediation pulse deployed to all devices. Sync commands issued.",
            scriptId,
            devicesTargeted: deviceIds.length,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[RemediateAPI] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
