import { NextRequest, NextResponse } from 'next/server';
import { saveAgentReportBySerial } from '@/lib/db';

/**
 * Endpoint for the Unified Security Agent to report vulnerabilities and 
 * update status back to the host.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceId, serialNumber, deviceName, vulnerabilities, updateCount, status } = body;

        // We prefer Serial Number as it's the most reliable link between Graph and the Agent
        const idToStore = serialNumber || deviceId;

        if (!idToStore) {
            return NextResponse.json({ error: "Missing identifier (deviceId or serialNumber)" }, { status: 400 });
        }

        console.log(`[AGENT-REPORT] Device: ${deviceName} (SN: ${serialNumber})`);
        console.log(`[AGENT-REPORT] Status: ${status}`);
        console.log(`[AGENT-REPORT] Updates Found: ${updateCount}`);

        // Persist the report to the database using the Serial Number
        await saveAgentReportBySerial(idToStore, {
            deviceId,
            serialNumber,
            deviceName,
            vulnerabilities: vulnerabilities || [],
            updateCount: updateCount || 0,
            status,
            timestamp: new Date().toISOString()
        });
        
        return NextResponse.json({ 
            success: true, 
            message: "Telemetry received and persisted" 
        });
    } catch (error: any) {
        console.error('[AGENT-REPORT] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
