import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function POST(request: Request) {
    try {
        const { policyId, action } = await request.json();
        const client = getGraphClient();

        if (action === 'exclude-enrollment') {
            console.log(`[REMEDIATION] Applying exclusion fix to policy: ${policyId}`);

            // 1. Fetch current policy
            const policy = await client.api(`/identity/conditionalAccess/policies/${policyId}`).get();

            // 2. Define IDs to exclude
            // Microsoft Intune Enrollment, Microsoft App Access Panel, Microsoft Intune
            const enrollmentAppIds = [
                'd4d45152-ee74-4775-97c2-d0f127431f00', 
                '29d9ed98-be98-482d-b35d-275dcc0f024c',
                '0000000a-0000-0000-c000-000000000000'
            ];

            // 3. Update the policy object
            const updatedPolicy = {
                conditions: {
                    ...policy.conditions,
                    applications: {
                        ...policy.conditions.applications,
                        excludeApplications: Array.from(new Set([
                            ...(policy.conditions.applications?.excludeApplications || []),
                            ...enrollmentAppIds
                        ]))
                    }
                }
            };

            // 4. Patch the policy
            await client.api(`/identity/conditionalAccess/policies/${policyId}`).patch(updatedPolicy);

            return NextResponse.json({
                success: true,
                message: `Exclusions added to policy "${policy.displayName}".`
            });
        }

        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });

    } catch (error: any) {
        console.error('[API] Policy remediation failed:', error.message);
        return NextResponse.json(
            { error: "Failed to remediate policy", details: error.message },
            { status: 500 }
        );
    }
}
