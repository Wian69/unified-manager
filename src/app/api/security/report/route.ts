import { NextRequest, NextResponse } from 'next/server';
import { saveAgentReportBySerial, setDeviceRemediationStatus, getPendingCommand, setPendingCommand } from '@/lib/db';

/**
 * Endpoint for the Unified Security Agent to report vulnerabilities and 
 * check for direct commands from the dashboard.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceId, serialNumber, deviceName, vulnerabilities, updateCount, status } = body;

        const idToStore = serialNumber || deviceId;

        if (!idToStore) {
            return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
        }

        // 1. Persist the report
        await saveAgentReportBySerial(idToStore, {
            deviceId,
            serialNumber,
            deviceName,
            vulnerabilities: vulnerabilities || [],
            missingUpdates: body.missingUpdates || [],
            updateCount: updateCount || 0,
            status,
            timestamp: new Date().toISOString()
        });

        // 2. Check for Pending Commands (Direct C2)
        const pendingCommand = await getPendingCommand(idToStore);
        
        // 3. Clear remediation status UI if no command is pending and agent says it's done
        // Or if we are delivering the command now, keep status active
        if (!pendingCommand) {
            await setDeviceRemediationStatus(idToStore, false);
        } else {
            // Clear the command queue as we are delivering it now
            await setPendingCommand(idToStore, null);
        }

        return NextResponse.json({ 
            success: true, 
            message: "Telemetry received",
            command: pendingCommand || null
        });
    } catch (error: any) {
        console.error('[AGENT-REPORT] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
