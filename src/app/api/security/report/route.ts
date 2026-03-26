import { NextRequest, NextResponse } from 'next/server';

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

        // In a real app, we would save this to a database (e.g. Supabase or Redis)
        // For now, we'll log it to the console which is visible in the Manager's logs.
        
        return NextResponse.json({ 
            success: true, 
            message: "Telemetry received" 
        });
    } catch (error: any) {
        console.error('[AGENT-REPORT] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
