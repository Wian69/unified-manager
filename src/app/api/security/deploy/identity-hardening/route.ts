import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const client = getGraphClient();
        
        // 1. Check if Legacy Auth Policy already exists
        const existingPolicies = await client.api('/identity/conditionalAccess/policies')
            .filter("displayName eq 'Security Hardening: Block Legacy Auth'")
            .get();

        let caPolicy;
        if (existingPolicies.value?.length === 0) {
            // Create Conditional Access Policy to Block Legacy Auth
            const caPayload = {
                displayName: "Security Hardening: Block Legacy Auth",
                state: "enabled",
                conditions: {
                    users: {
                        includeUsers: ["All"],
                        excludeUsers: []
                    },
                    applications: {
                        includeApplications: ["All"]
                    },
                    clientAppTypes: ["exchangeActiveSync", "other"]
                },
                grantControls: {
                    operator: "OR",
                    builtInControls: ["block"]
                }
            };

            caPolicy = await client.api('/identity/conditionalAccess/policies')
                .post(caPayload);
        } else {
            caPolicy = existingPolicies.value[0];
        }

        return NextResponse.json({
            success: true,
            caPolicy: caPolicy.displayName,
            status: "Legacy Auth Blocked"
        });

    } catch (error: any) {
        console.error('[API] Hardening failed:', error.message);
        return NextResponse.json(
            { error: "Failed to apply Legacy Auth Block", details: error.message },
            { status: 500 }
        );
    }
}
