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

        // 2. Fetch Security Recommendations
        try {
            const recommendationsResponse = await client.api('/security/secureScoreControlProfiles').get();
            recommendations = recommendationsResponse.value || [];
        } catch (e: any) {
            console.warn('[API] Recommendations fetch failed:', e.message);
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
