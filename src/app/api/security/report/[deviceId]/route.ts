import { NextRequest, NextResponse } from 'next/server';
import { getAgentReportBySerial } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    try {
        const { deviceId } = await params;
        
        if (!deviceId) {
            return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
        }

        // The 'deviceId' parameter in this route can now be either the Graph ID or the Serial Number.
        // We prioritize Serial Number as established in the new mapping logic.
        const report = await getAgentReportBySerial(deviceId);

        return NextResponse.json(report || { 
            status: "No report found",
            vulnerabilities: [],
            updateCount: 0,
            timestamp: null
        });
    } catch (error: any) {
        console.error('[AGENT-GET-REPORT] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
