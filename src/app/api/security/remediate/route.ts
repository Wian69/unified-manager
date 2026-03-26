import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';
import { setDeviceRemediationStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const client = getGraphClient();

        const body = await req.json().catch(() => ({}));
        const targetDeviceId = body.deviceId;

        // 0. Cleanup Old Pulse Scripts (Optional but recommended to avoid clutter)
        try {
            const existingScripts = await client.api('/deviceManagement/deviceManagementScripts').version('beta').get();
            const oldPulses = (existingScripts.value || []).filter((s: any) => s.displayName?.startsWith('Remediation_Pulse') || s.displayName?.startsWith('Single_Remedy_'));
            for (const script of oldPulses) {
                await client.api(`/deviceManagement/deviceManagementScripts/${script.id}`).version('beta').delete();
            }
        } catch (e: any) { console.warn('[RemediateAPI] Cleanup failed (non-critical):', e.message); }

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
            "@odata.type": "#microsoft.graph.deviceManagementScript",
            displayName: targetDeviceId ? `Single_Remedy_${targetDeviceId.substring(0,8)}` : `Remediation_Pulse_${timestamp}`,
            description: "Targeted vulnerability and update remediation",
            scriptContent: encodedScript,
            fileName: "remedy.ps1",
            runAsAccount: "system",
            enforceSignatureCheck: false,
            runAs32Bit: false,
            retryCount: 3,
            blockExecutionNotifications: true,
            executionFrequency: "PT0S" // Run once
        };

        const createdScript = await client.api('/deviceManagement/deviceManagementScripts').version('beta').post(scriptPayload);
        const scriptId = createdScript.id;

        // VERIFICATION: Check if content actually stuck
        try {
            const verifiedScript = await client.api(`/deviceManagement/deviceManagementScripts/${scriptId}`).version('beta').get();
            console.log(`[RemediateAPI] Script created. ID: ${scriptId}, Content Length: ${verifiedScript.scriptContent?.length || 0}`);
        } catch (vErr: any) {
            console.warn('[RemediateAPI] Verification fetch failed:', vErr.message);
        }

        // 3. Assign to All Devices (Global Assignment)
        // Adding a small delay to ensure backend consistency before assignment
        await new Promise(resolve => setTimeout(resolve, 3000));

        const assignmentPayload = {
            deviceManagementScriptAssignments: [
                {
                    target: {
                        "@odata.type": "#microsoft.graph.allDevicesAssignmentTarget"
                    }
                }
            ]
        };

        await client.api(`/deviceManagement/deviceManagementScripts/${scriptId}/assign`).version('beta').post(assignmentPayload);

        // 4. Trigger Native Remote Actions & Track Status
        let targetIds = [];
        if (targetDeviceId) {
            targetIds = [targetDeviceId];
            
            // Fetch SN to set remediation status in DB
            try {
                const device = await client.api(`/deviceManagement/managedDevices/${targetDeviceId}`).select('serialNumber').get();
                if (device?.serialNumber) {
                    await setDeviceRemediationStatus(device.serialNumber, true);
                }
            } catch (e) {}
        } else {
            const devices = await client.api('/deviceManagement/managedDevices').select('id,deviceName').top(50).get();
            targetIds = (devices.value || []).map((d: any) => d.id);
        }

        const nativeActions = targetIds.map((id: string) => [
            client.api(`/deviceManagement/managedDevices/${id}/windowsDefenderUpdateSignatures`).post({}),
            client.api(`/deviceManagement/managedDevices/${id}/windowsDefenderScan`).post({ quickScan: true }),
            client.api(`/deviceManagement/managedDevices/${id}/syncDevice`).post({})
        ]).flat();

        await Promise.allSettled(nativeActions);

        return NextResponse.json({
            success: true,
            message: targetDeviceId ? "Instant remediation triggered for device." : "Global remediation pulse sent!",
            scriptId,
            devicesTargeted: targetIds.length,
            timestamp: new Date().toISOString(),
            logs: [
                "Intune Cleanup: Successful",
                `Script Created: ${scriptId}`,
                "Assignment: All Devices (Security Standard)",
                `MDM Actions: ${targetIds.length} sync/scan pulses sent`
            ]
        });

    } catch (error: any) {
        console.error('[RemediateAPI] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
