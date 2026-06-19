import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch all Conditional Access policies
        const response = await client.api('/identity/conditionalAccess/policies').get();
        const policies = response.value || [];

        const adminMfaPolicies = policies.filter((p: any) => {
            const hasAdminRoles = p.conditions?.users?.includeRoles?.length > 0;
            const requiresMfa = p.grantControls?.builtInControls?.includes('mfa');
            const isActive = p.state === 'enabled';
            return hasAdminRoles && requiresMfa && isActive;
        });

        return NextResponse.json({
            isEnforced: adminMfaPolicies.length > 0,
            policies: adminMfaPolicies.map((p: any) => ({
                name: p.displayName,
                roles: p.conditions.users.includeRoles
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
