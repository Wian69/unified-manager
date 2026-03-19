import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        let secureScore = null;
        let recommendations = [];
        let recentAlerts = [];

        // 1. Fetch Secure Score
        try {
            const scoreResponse = await client.api('/security/secureScores').top(1).get();
            secureScore = scoreResponse.value?.[0] || null;
        } catch (e: any) {
            console.warn('[API] Secure Score fetch failed:', e.message);
        }

        // 2. Fetch TVM Vulnerability Recommendations (CVEs)
        try {
            // This is the modern Microsoft Graph endpoint for Defender Vulnerability Management
            const recommendationsResponse = await client.api('/security/vulnerabilityManagement/recommendations')
                .top(20)
                .get();
            recommendations = recommendationsResponse.value || [];
        } catch (e: any) {
            console.warn('[API] TVM Recommendations fetch failed:', e.message);
            // Fallback to Secure Score recommendations if TVM is not available or licensed
            try {
                const ssRecs = await client.api('/security/secureScoreControlProfiles').get();
                recommendations = ssRecs.value || [];
            } catch (ssErr: any) {
                console.warn('[API] Secure Score fallback also failed:', ssErr.message);
            }
        }

        // 3. Fetch Recent Alerts
        try {
            const alertsResponse = await client.api('/security/alerts')
                .top(5)
                .orderby('eventDateTime desc')
                .get();
            recentAlerts = alertsResponse.value || [];
        } catch (e: any) {
            console.warn('[API] Alerts fetch failed:', e.message);
        }

        return NextResponse.json({
            secureScore,
            recommendations,
            recentAlerts
        });
    } catch (error: any) {
        console.error('[API] Graph API Error (Security):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch security information", details: error.message },
            { status: 500 }
        );
    }
}
