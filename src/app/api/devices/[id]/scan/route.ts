import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';
import { setPendingCommand, setDeviceRemediationStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * API to queue remote commands (C2) to the Unified Agent.
 * Used by the Live Data Dashboard and Device Details overlay.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id; // This can be a User ID or Device ID
        const body = await req.json();
        const { type, payload } = body;

        if (!type) {
            return NextResponse.json({ error: "Missing command type" }, { status: 400 });
        }

        const client = getGraphClient();
        
        // 1. Resolve the device and its serial number
        // In the offboarding flow, 'id' is often the User ID.
        // We look for the primary Windows device for this user.
        let serialNumber = '';
        try {
            // First try assuming 'id' is a Managed Device ID
            const device = await client.api(`/deviceManagement/managedDevices/${id}`).select('serialNumber').get();
            serialNumber = device?.serialNumber;
        } catch (e) {
            // If that fails, assume 'id' is a User ID and find their devices
            try {
                const devices = await client.api(`/users/${id}/managedDevices`).select('serialNumber,operatingSystem').get();
                const windowsDevice = devices.value.find((d: any) => d.operatingSystem?.toLowerCase().includes('windows'));
                serialNumber = windowsDevice?.serialNumber;
            } catch (e2) {
                console.error("[SCAN-API] Failed to resolve device for ID:", id);
            }
        }

        if (!serialNumber) {
            return NextResponse.json({ error: "Could not resolve a Windows device serial number for this ID." }, { status: 404 });
        }

        console.log(`[SCAN-API] Queueing command [${type}] for SN: ${serialNumber}`);

        // 2. Queue the command in the DB/KV
        // We store the whole body as the command object
        await setPendingCommand(serialNumber, body);
        
        // 3. Update the UI status to show remediation/activity is starting
        await setDeviceRemediationStatus(serialNumber, true, [`Command Queued: ${type}`, "Waiting for Agent Heartbeat..."]);

        // 4. Optional: Trigger an MDM sync to speed up the agent pull (if the agent polls on sync)
        try {
            // We need the actual Managed Device ID for the sync action
            const devices = await client.api('/deviceManagement/managedDevices').filter(`serialNumber eq '${serialNumber}'`).select('id').get();
            if (devices.value?.[0]?.id) {
                await client.api(`/deviceManagement/managedDevices/${devices.value[0].id}/syncDevice`).post({});
            }
        } catch (e) {}

        return NextResponse.json({
            success: true,
            message: `Command [${type}] queued successfully.`,
            serialNumber
        });

    } catch (error: any) {
        console.error('[SCAN-API] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
