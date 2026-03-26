import { NextRequest, NextResponse } from 'next/server';
import { saveAgentReport } from '@/lib/db';

/**
 * Endpoint for the Unified Security Agent to report vulnerabilities and 
 * update status back to the host.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceId, deviceName, vulnerabilities, updateCount, status } = body;

        if (!deviceId) {
            return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
        }

        console.log(`[AGENT-REPORT] Device: ${deviceName} (${deviceId})`);
        console.log(`[AGENT-REPORT] Status: ${status}`);
        console.log(`[AGENT-REPORT] Updates Found: ${updateCount}`);
        console.log(`[AGENT-REPORT] Vulnerabilities:`, vulnerabilities);

        // Persist the report to the database (KV or Supabase)
        await saveAgentReport(deviceId, {
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
