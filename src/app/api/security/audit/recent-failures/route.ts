import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // 1. Fetch recent failed sign-ins (last 24 hours)
        const filter = "status/errorCode ne 0";
        const signInsResponse = await client.api('/auditLogs/signIns')
            .filter(filter)
            .top(50)
            .orderby('createdDateTime desc')
            .get();

        const failures = signInsResponse.value || [];

        // 2. Fetch all CA policies to resolve IDs to names
        let policyMap = new Map();
        try {
            const policiesResponse = await client.api('/identity/conditionalAccess/policies').get();
            policyMap = new Map(policiesResponse.value.map((p: any) => [p.id, p.displayName]));
        } catch (e) {
            console.warn('[API] Could not fetch policies for name resolution:', e);
        }

        return NextResponse.json({
            count: failures.length,
            failures: failures.map((f: any) => ({
                id: f.id,
                user: f.userDisplayName || f.userPrincipalName,
                userPrincipalName: f.userPrincipalName,
                time: f.createdDateTime,
                app: f.appDisplayName,
                errorCode: f.status?.errorCode,
                failureReason: f.status?.failureReason,
                location: f.location?.city + ', ' + f.location?.countryOrRegion,
                ip: f.ipAddress,
                conditionalAccessStatus: f.conditionalAccessStatus,
                deviceDetail: f.deviceDetail,
                appliedPolicies: (f.appliedConditionalAccessPolicies || []).map((p: any) => ({
                    id: p.id,
                    displayName: policyMap.get(p.id) || p.displayName || 'Unknown Policy',
                    result: p.result,
                    enforcedGrantControls: p.enforcedGrantControls || [],
                    enforcedSessionControls: p.enforcedSessionControls || []
                }))
            }))
        });
    } catch (error: any) {
        console.error('[API] Audit logs fetch failed:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch audit logs", details: error.message },
            { status: 500 }
        );
    }
}
