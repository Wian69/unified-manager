import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const client = getGraphClient();
        const { deviceId, scriptId } = await req.json();

        if (!deviceId || !scriptId) {
            return NextResponse.json({ error: "Missing deviceId or scriptId" }, { status: 400 });
        }

        console.log(`[IntuneAPI] Triggering remediation ${scriptId} on device ${deviceId}...`);

        // Trigger the "Initiate On Demand Proactive Remediation" action
        // Endpoint: POST /deviceManagement/managedDevices/{managedDeviceId}/initiateOnDemandProactiveRemediation
        await client.api(`/deviceManagement/managedDevices/${deviceId}/initiateOnDemandProactiveRemediation`)
            .version('beta')
            .post({
                scriptPolicyId: scriptId
            });

        return NextResponse.json({
            success: true,
            message: "Intune remediation triggered successfully."
        });

    } catch (error: any) {
        console.error('[IntuneAPI] Error triggering remediation:', error.message);
        return NextResponse.json({ 
            error: error.message,
            details: error.body ? JSON.parse(error.body) : null
        }, { status: 500 });
    }
}
