import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch Tenant-wide Windows Hello for Business settings
        // This is the global configuration found in Enrollment > Windows enrollment
        const response = await client.api('/deviceManagement/windowsHelloForBusinessSettings').get();

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('[API] Global WHfB check failed:', error.message);
        return NextResponse.json(
            { error: "Failed to check Global WHfB status", details: error.message },
            { status: 500 }
        );
    }
}
