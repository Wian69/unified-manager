import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

const SKU_FRIENDLY_NAMES: Record<string, string> = {
    'SPB': 'Microsoft 365 Business Premium',
    'SPE_E3': 'Microsoft 365 E3',
    'SPE_E5': 'Microsoft 365 E5',
    'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
    'EXCHANGEONLINE': 'Exchange Online (Plan 1)',
    'EXCHANGE_ONLINE_P1': 'Exchange Online (Plan 1)',
    'EXCHANGE_ONLINE_P2': 'Exchange Online (Plan 2)',
    'AAD_PREMIUM_P1': 'Microsoft Entra ID P1',
    'AAD_PREMIUM_P2': 'Microsoft Entra ID P2',
    'COPILOT_PRO': 'Microsoft 365 Copilot',
    'Microsoft_365_Copilot': 'Microsoft 365 Copilot',
    'COPILOT_STUDIO_VIRAL': 'Microsoft Copilot Studio Viral Trial',
    'FABRIC_FREE': 'Microsoft Fabric (Free)',
    'POWER_APPS_FOR_DEVELOPER': 'Microsoft Power Apps for Developer',
    'POWER_AUTOMATE_FREE': 'Microsoft Power Automate Free',
    'STREAM': 'Microsoft Stream Trial',
    'INTUNE_A': 'Microsoft Intune',
    'VISIOCLIENT': 'Visio Plan 2',
    'PROJECTCLIENT': 'Project Plan 3'
};

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch Subscribed SKUs (Licenses)
        const response = await client.api('/subscribedSkus')
            .select('id,skuId,skuPartNumber,capabilityStatus,consumedUnits,prepaidUnits')
            .get();

        const skus = response.value || [];
        
        // Map to friendly names and filter for active licenses only
        const activeSkus = skus
            .filter((sku: any) => sku.capabilityStatus === 'Enabled')
            .map((sku: any) => ({
                ...sku,
                friendlyName: SKU_FRIENDLY_NAMES[sku.skuPartNumber] || sku.skuPartNumber.replace(/_/g, ' ')
            }));

        return NextResponse.json({ skus: activeSkus }, { status: 200 });
    } catch (error: any) {
        console.error('[API] Onboarding SKUs Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch available licenses", details: error.message },
            { status: 500 }
        );
    }
}
