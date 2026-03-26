import { NextRequest, NextResponse } from 'next/server';
import { getAgentReport } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    try {
        const { deviceId } = await params;
        
        if (!deviceId) {
            return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
        }

        const report = await getAgentReport(deviceId);

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
