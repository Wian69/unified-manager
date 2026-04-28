import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        console.log('[API] Fetching Intune Enrollment Restrictions...');
        
        // Fetch enrollment configurations (includes restrictions)
        const response = await client.api('/deviceManagement/deviceEnrollmentConfigurations').get();
        const restrictions = response.value || [];

        // Filter for platform restrictions (deviceEnrollmentPlatformRestrictionsConfiguration)
        const platformRestrictions = restrictions.filter((r: any) => 
            r['@odata.type'] === '#microsoft.graph.deviceEnrollmentPlatformRestrictionsConfiguration'
        );

        return NextResponse.json({
            count: platformRestrictions.length,
            restrictions: platformRestrictions.map((r: any) => ({
                id: r.id,
                displayName: r.displayName,
                priority: r.priority,
                lastModifiedDateTime: r.lastModifiedDateTime,
                iosRestriction: r.iosRestriction,
                windowsRestriction: r.windowsRestriction,
                androidRestriction: r.androidRestriction,
                macosRestriction: r.macosRestriction
            }))
        });
    } catch (error: any) {
        console.error('[API] Intune restrictions fetch failed:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch Intune enrollment restrictions", details: error.message },
            { status: 500 }
        );
    }
}
