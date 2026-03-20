import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('[API] GET /api/devices - Standard Fetch');
    try {
        const client = getGraphClient();
        const response = await client.api('/deviceManagement/managedDevices')
            .select('id,deviceName,operatingSystem,lastSyncDateTime,complianceState,serialNumber,userPrincipalName')
            .top(999)
            .get();
        
        const devices = response.value || [];
        console.log(`[API] Devices list: ${devices.length} items found.`);

        return NextResponse.json({
            devices: devices,
            activeCount: devices.filter((d: any) => d.complianceState === 'compliant').length,
        });
    } catch (error: any) {
        console.error('[API] Managed Devices Error:', error.message);
        return NextResponse.json(
            { error: "Fetch failed", details: error.message },
            { status: 500 }
        );
    }
}
