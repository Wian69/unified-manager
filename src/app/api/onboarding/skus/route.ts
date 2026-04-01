import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch Subscribed SKUs (Licenses)
        const response = await client.api('/subscribedSkus')
            .select('id,skuId,skuPartNumber,capabilityStatus,consumedUnits,prepaidUnits')
            .get();

        const skus = response.value || [];
        
        // Filter for active licenses only
        const activeSkus = skus.filter((sku: any) => sku.capabilityStatus === 'Enabled');

        return NextResponse.json({ skus: activeSkus }, { status: 200 });
    } catch (error: any) {
        console.error('[API] Onboarding SKUs Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch available licenses", details: error.message },
            { status: 500 }
        );
    }
}
