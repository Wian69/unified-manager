import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';
import { setDeviceRemediationStatus, setPendingCommand } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const client = getGraphClient();
        const body = await req.json().catch(() => ({}));
        const targetDeviceId = body.deviceId;
        let serialNumber = body.serialNumber;

        // 1. Resolve Serial Number if not provided
        if (targetDeviceId && !serialNumber) {
            try {
                const device = await client.api(`/deviceManagement/managedDevices/${targetDeviceId}`).select('serialNumber').get();
                serialNumber = device?.serialNumber;
            } catch (e) {}
        }

        if (!serialNumber) {
            return NextResponse.json({ error: "Missing serialNumber for direct communication" }, { status: 400 });
        }

        // 2. Queue Direct Command (Bypass Intune Scripts as requested)
        const initialLogs = [
            "Intune Scripting: BYPASSED (Direct Request)",
            `Direct C2 Signal: STAGED (SN: ${serialNumber})`,
            "Trigger: MDM Sync Sent to Device",
            "Status: Awaiting Agent Heartbeat Pull"
        ];
        
        await setPendingCommand(serialNumber, "remediate");
        await setDeviceRemediationStatus(serialNumber, true, initialLogs);

        // 3. Trigger MDM Sync to "Wake Up" agent (MDM sync is fast and direct)
        if (targetDeviceId) {
            try {
                await client.api(`/deviceManagement/managedDevices/${targetDeviceId}/syncDevice`).post({});
            } catch (e) {}
        }

        return NextResponse.json({
            success: true,
            message: "Direct remediation command queued to agent.",
            serialNumber,
            timestamp: new Date().toISOString(),
            logs: initialLogs
        });

    } catch (error: any) {
        console.error('[RemediateAPI] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
