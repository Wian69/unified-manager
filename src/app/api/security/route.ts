import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        let secureScore = null;
        let recommendations = [];
        let recentAlerts = [];

        const errors: Record<string, string> = {};

        // 1. Fetch Secure Score
        try {
            const scoreResponse = await client.api('/security/secureScores').top(1).get();
            secureScore = scoreResponse.value?.[0] || null;
        } catch (e: any) {
            errors.secureScore = e.message;
            console.warn('[API] Secure Score fetch failed:', e.message);
        }

        // 2. Fetch TVM Vulnerability Recommendations (BETA)
        try {
            const recommendationsResponse = await client.api('/security/vulnerabilityManagement/recommendations')
                .version('beta')
                .top(20)
                .get();
            recommendations = recommendationsResponse.value || [];
        } catch (e: any) {
            errors.recommendations = e.message;
            console.warn('[API] TVM Recommendations fetch failed (Beta):', e.message);
        }

        // 3. Sequential Vulnerability Discovery (CVE Catalog)
        let vulnerabilities = [];
        const discoveryReport: string[] = [];
        
        const vulnerabilityEndpoints = [
            { path: '/security/vulnerabilityManagement/vulnerabilities', version: 'beta', name: 'TVM Beta' },
            { path: '/security/vulnerabilityManagement/vulnerabilities', version: 'v1.0', name: 'TVM V1.0' },
            { path: '/security/threatIntelligence/vulnerabilities', version: 'v1.0', name: 'MDTI V1.0' },
            { path: '/security/vulnerabilities', version: 'v1.0', name: 'Security V1.0' }
        ];

        for (const endpoint of vulnerabilityEndpoints) {
            try {
                const response = await client.api(endpoint.path)
                    .version(endpoint.version as any)
                    .top(20)
                    .get();
                
                if (response.value && response.value.length > 0) {
                    vulnerabilities = response.value;
                    discoveryReport.push(`MATCH: Found ${vulnerabilities.length} CVEs at ${endpoint.name}`);
                    delete errors.vulnerabilities; // Clear previous errors if we found data
                    break;
                } else {
                    discoveryReport.push(`EMPTY: ${endpoint.name} returned 0 results`);
                }
            } catch (e: any) {
                discoveryReport.push(`FAIL: ${endpoint.name} -> ${e.message}`);
                errors.vulnerabilities = `Last attempt failed: ${e.message}. See discovery logs.`;
            }
        }

        // 4. Fetch Recent Alerts
        try {
            const alertsResponse = await client.api('/security/alerts')
                .top(5)
                .orderby('eventDateTime desc')
                .get();
            recentAlerts = alertsResponse.value || [];
        } catch (e: any) {
            errors.alerts = e.message;
            console.warn('[API] Alerts fetch failed:', e.message);
        }

        return NextResponse.json({
            secureScore,
            recommendations,
            vulnerabilities,
            recentAlerts,
            errors,
            discoveryReport
        });
    } catch (error: any) {
        console.error('[API] Graph API Error (Security):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch security information", details: error.message },
            { status: 500 }
        );
    }
}
