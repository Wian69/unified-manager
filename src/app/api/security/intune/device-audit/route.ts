import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch Managed Devices with more details to find the Edition
        const response = await client.api('/deviceManagement/managedDevices')
            .select('deviceName,operatingSystem,osVersion,model,manufacturer,complianceState,managementAgent')
            .get();

        return NextResponse.json(response.value || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
