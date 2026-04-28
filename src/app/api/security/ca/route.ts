import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        console.log('[API] Fetching Conditional Access Policies...');
        
        // Fetch policies
        const policiesResponse = await client.api('/identity/conditionalAccess/policies').get();
        const policies = policiesResponse.value || [];

        // Fetch named locations (to resolve IDs)
        const locationsResponse = await client.api('/identity/conditionalAccess/namedLocations').get();
        const namedLocations = locationsResponse.value || [];
        const locationMap = new Map(namedLocations.map((l: any) => [l.id, l.displayName]));

        const regionalBlocks = policies.filter((p: any) => {
            const hasLocationCondition = p.conditions?.locations?.includeLocations?.length > 0 || 
                                       p.conditions?.locations?.excludeLocations?.length > 0;
            const isBlock = p.grantControls?.builtInControls?.includes('block');
            return hasLocationCondition && isBlock;
        }).map((p: any) => ({
            id: p.id,
            displayName: p.displayName,
            state: p.state,
            includeLocations: p.conditions.locations.includeLocations.map((id: string) => locationMap.get(id) || id),
            excludeLocations: p.conditions.locations.excludeLocations.map((id: string) => locationMap.get(id) || id),
            grantControls: p.grantControls?.builtInControls || []
        }));

        return NextResponse.json({
            count: regionalBlocks.length,
            policies: regionalBlocks,
            allPoliciesCount: policies.length
        });
    } catch (error: any) {
        console.error('[API] Conditional Access fetch failed:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch Conditional Access policies", details: error.message },
            { status: 500 }
        );
    }
}
