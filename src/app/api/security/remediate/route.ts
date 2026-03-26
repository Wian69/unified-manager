import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const client = getGraphClient();

        // 1. Remediation Script Content (Base64)
        // This script forces a Windows Update detection, Defender definition update, and quick scan.
        const remediationScript = `# Windows Update & Vulnerability Remediation Script (Auto-Generated)
Write-Output "Starting Global Remediation Pulse..."
try {
    # Force COM-based Windows Update Detection
    $AutoUpdate = New-Object -ComObject "Microsoft.Update.AutoUpdate"
    $AutoUpdate.DetectNow()
    
    # Trigger Interactive Scan
    Start-Process -FilePath "usoclient.exe" -ArgumentList "StartInteractiveScan" -Wait
    
    # Update Defender Signatures and Scan
    Update-MpSignature
    Start-MpScan -ScanType QuickScan
    
    # Ensure Security Services are Running
    Get-Service -Name "WinDefend", "Wuauserv", "MpsSvc" | Where-Object { $_.Status -ne 'Running' } | Start-Service
    
    Write-Output "Remediation Pulse Completed Successfully."
} catch {
    Write-Output "Error during remediation: $_"
}
`;

        const encodedScript = Buffer.from(remediationScript).toString('base64');

        // 2. Create the Device Management Script in Intune (MUST USE BETA)
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

        const createdScript = await client.api('/deviceManagement/deviceManagementScripts').version('beta').post(scriptPayload);
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

        await client.api(`/deviceManagement/deviceManagementScripts/${scriptId}/assign`).version('beta').post(assignmentPayload);

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
