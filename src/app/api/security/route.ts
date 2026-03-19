import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch Secure Score from Microsoft Defender / Security Center
        const scoreResponse = await client.api('/security/secureScores')
            .top(1)
            .get();

        // Fetch Security Recommendations (Control Profiles)
        // These contain the vulnerabilities and remediation steps
        const recommendationsResponse = await client.api('/security/secureScoreControlProfiles')
            .get();

        // Fetch Recent Security Alerts
        const alertsResponse = await client.api('/security/alerts')
            .filter("status ne 'resolved'") // Show non-resolved alerts
            .top(10)
            .get();

        return NextResponse.json({
            secureScore: scoreResponse.value?.[0] || null,
            recommendations: recommendationsResponse.value || [],
            recentAlerts: alertsResponse.value || [],
        });
    } catch (error: any) {
        console.error('[API] Graph API Error (Security):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch security information", details: error.message },
            { status: 500 }
        );
    }
}
