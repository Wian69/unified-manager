import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        console.log('[API] Fetching MAM Policies...');
        
        const [iosRes, androidRes] = await Promise.all([
            client.api('/deviceAppManagement/iosManagedAppProtections').get(),
            client.api('/deviceAppManagement/androidManagedAppProtections').get()
        ]);

        return NextResponse.json({
            iosPolicies: iosRes.value || [],
            androidPolicies: androidRes.value || []
        });
    } catch (error: any) {
        console.error('[API] MAM fetch failed:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch MAM policies", details: error.message },
            { status: 500 }
        );
    }
}
