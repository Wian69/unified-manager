import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('[API] GET /api/devices initiated...');
    try {
        const client = getGraphClient();
        console.log('[API] Fetched graph client, calling /deviceManagement/managedDevices...');

        let allDevices: any[] = [];
        let response = await client.api('/deviceManagement/managedDevices')
            .get();
        
        const devices = response.value || [];
        console.log(`[API] Successfully fetched ${devices.length} devices.`);

        // Sort alphabetically by deviceName
        devices.sort((a: any, b: any) => (a.deviceName || '').localeCompare(b.deviceName || ''));

        return NextResponse.json({
            devices: devices,
            activeCount: devices.filter((d: any) => d.complianceState === 'compliant').length,
        });
    } catch (error: any) {
        console.error('[API] Graph API Error (Devices):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch devices", details: error.message },
            { status: 500 }
        );
    }
}
