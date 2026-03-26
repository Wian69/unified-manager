import { NextRequest, NextResponse } from 'next/server';
import { getAgentReportBySerial, getDeviceRemediationStatus } from '@/lib/db';

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
        const report = await getAgentReportBySerial(deviceId);
        const remediation = await getDeviceRemediationStatus(deviceId);

        if (!report) {
            return NextResponse.json({ 
                status: "No report found",
                vulnerabilities: [],
                updateCount: 0,
                timestamp: null,
                remediationActive: remediation?.active || false
            });
        }

        return NextResponse.json({
            ...(report as object),
            remediationActive: remediation?.active || false
        });
    } catch (error: any) {
        console.error('[AGENT-GET-REPORT] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
