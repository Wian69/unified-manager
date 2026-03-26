import { NextRequest, NextResponse } from 'next/server';
import { appendRemediationLog } from '@/lib/db';

/**
 * Endpoint for the agent to report intermediate progress steps 
 * during a remediation cycle.
 */
export async function POST(req: NextRequest) {
    try {
        const { serialNumber, log } = await req.json();

        if (!serialNumber || !log) {
            return NextResponse.json({ error: "Missing serialNumber or log content" }, { status: 400 });
        }

        await appendRemediationLog(serialNumber, log);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[PROGRESS-API] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
