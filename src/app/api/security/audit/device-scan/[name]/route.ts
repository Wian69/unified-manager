import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    try {
        const client = getGraphClient();
        const { name } = await params;
        const deviceName = name.toUpperCase();

        // 1. Find the device by name
        const deviceResponse = await client.api('/deviceManagement/managedDevices')
            .filter(`deviceName eq '${deviceName}'`)
            .top(1)
            .get();

        if (!deviceResponse.value || deviceResponse.value.length === 0) {
            return NextResponse.json({ error: `Device '${deviceName}' not found.` }, { status: 404 });
        }

        const device = deviceResponse.value[0];

        // 2. Get detected apps for this device via the device's relationship
        const appsResponse = await client.api(`/deviceManagement/managedDevices/${device.id}`)
            .expand('detectedApps')
            .get();

        const apps = appsResponse.detectedApps || [];

        // 3. Flag potentially vulnerable apps
        const riskyPatterns = ['chrome', 'zoom', 'adobe', 'firefox', 'vlc', 'java', '7-zip', 'python', 'node', 'winrar'];
        const flaggedApps = apps.filter((app: any) =>
            riskyPatterns.some(p => app.displayName?.toLowerCase().includes(p))
        );

        return NextResponse.json({
            device: {
                name: device.deviceName,
                id: device.id,
                os: device.operatingSystem,
                osVersion: device.osVersion,
                complianceState: device.complianceState,
                lastSync: device.lastSyncDateTime,
                manufacturer: device.manufacturer,
                model: device.model
            },
            totalApps: apps.length,
            flaggedApps: flaggedApps.map((app: any) => ({
                name: app.displayName,
                version: app.version,
                sizeInByte: app.sizeInByte
            })),
            allApps: apps.map((app: any) => ({
                name: app.displayName,
                version: app.version
            }))
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
