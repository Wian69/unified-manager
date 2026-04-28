import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function POST(request: Request) {
    try {
        const { policyId, action } = await request.json();
        const client = getGraphClient();

        // Enrollment apps to exclude
        const enrollmentAppIds = [
            'd4d45152-ee74-4775-97c2-d0f127431f00', 
            '29d9ed98-be98-482d-b35d-275dcc0f024c',
            '0000000a-0000-0000-c000-000000000000'
        ];

        if (action === 'exclude-enrollment') {
            const policiesToUpdate = [];

            if (policyId) {
                // Targeted fix
                policiesToUpdate.push(await client.api(`/identity/conditionalAccess/policies/${policyId}`).get());
            } else {
                // Universal fix - scan all policies for potential blocks
                console.log('[REMEDIATION] Performing Universal scan...');
                const allPolicies = await client.api('/identity/conditionalAccess/policies').get();
                
                // Identify policies that require compliant devices or MFA for all apps
                for (const p of allPolicies.value) {
                    const grantControls = p.grantControls?.builtInControls || [];
                    const hasComplianceReq = grantControls.includes('compliantDevice') || grantControls.includes('mfa');
                    
                    if (hasComplianceReq && p.state === 'enabled') {
                        policiesToUpdate.push(p);
                    }
                }
            }

            if (policiesToUpdate.length === 0) {
                return NextResponse.json({ error: "No relevant policies found to update." }, { status: 404 });
            }

            // Apply updates
            for (const policy of policiesToUpdate) {
                console.log(`[REMEDIATION] Updating policy: ${policy.displayName}`);
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
                await client.api(`/identity/conditionalAccess/policies/${policy.id}`).patch(updatedPolicy);
            }

            return NextResponse.json({
                success: true,
                message: `Exclusions added to ${policiesToUpdate.length} policy/policies.`
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
