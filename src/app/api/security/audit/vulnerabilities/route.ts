import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch managed devices to find a target for a deep scan
        const devicesResponse = await client.api('/deviceManagement/managedDevices')
            .select('id,deviceName,complianceState,lastSyncDateTime')
            .top(10)
            .get();

        const devices = devicesResponse.value || [];
        const nonCompliant = devices.filter((d: any) => d.complianceState !== 'compliant');

        return NextResponse.json({
            totalChecked: devices.length,
            nonCompliantCount: nonCompliant.length,
            nonCompliantDevices: nonCompliant.map((d: any) => ({
                name: d.deviceName,
                status: d.complianceState,
                lastSync: d.lastSyncDateTime
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
