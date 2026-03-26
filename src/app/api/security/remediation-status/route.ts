import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const client = getGraphClient();

        // 1. Find the latest Remediation Pulse script
        const scripts = await client.api('/deviceManagement/deviceManagementScripts').version('beta').get();
        const latestPulse = scripts.value
            ?.filter((s: any) => s.displayName?.startsWith('Remediation_Pulse'))
            ?.sort((a: any, b: any) => new Date(b.createdDateTime).getTime() - new Date(a.createdDateTime).getTime())[0];

        // 2. Fetch device run states for this script
        const runStatesRes = await client.api(`/deviceManagement/deviceManagementScripts/${latestPulse.id}/deviceRunStates`).version('beta').get();
        const runStates = runStatesRes.value || [];
        
        const summary = {
            total: runStates.length,
            success: 0,
            error: 0,
            pending: 0,
            details: [] as any[]
        };

        runStates.forEach((state: any) => {
            if (state.runState === 'success') summary.success++;
            else if (state.runState === 'error') summary.error++;
            else summary.pending++;

            summary.details.push({
                deviceId: state.managedDeviceId,
                deviceName: state.deviceName || 'Unknown Device',
                status: state.runState,
                lastUpdate: state.lastStateUpdateDateTime
            });
        });

        // If no devices have checked in yet but the script is brand new (< 5 mins), show 1% instead of 0% to force UI visibility
        const isNew = (new Date().getTime() - new Date(latestPulse.createdDateTime).getTime()) < 5 * 60 * 1000;
        let percent = summary.total > 0 ? Math.round((summary.success / summary.total) * 100) : (isNew ? 1 : 0);

        return NextResponse.json({
            status: percent === 100 ? 'completed' : 'in-progress',
            scriptName: latestPulse.displayName,
            percent,
            summary,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[RemediationStatus] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
