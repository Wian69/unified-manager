import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
});

const client = Client.initWithMiddleware({
    debugLogging: false,
    authProvider
});

const PRICING_MAP: Record<string, number> = {
    "SPB": 22.00,
    "AAD_PREMIUM_P2": 9.00,
    "EXCHANGESTANDARD": 4.00,
    "EXCHANGEENTERPRISE": 8.00,
    "POWER_BI_STANDARD": 10.00,
    "Remote_Help_AddOn": 3.50,
    "Microsoft_365_Copilot": 30.00,
    "RMSBASIC": 2.00
};

async function run() {
    try {
        const skusRes = await client.api('/subscribedSkus').get();
        let purchasedCost = 0;
        let assignedCost = 0;
        
        console.log("--- Purchased Licenses (What you actually pay for) ---");
        for (const sku of skusRes.value) {
            const purchased = sku.prepaidUnits.enabled + sku.prepaidUnits.warning;
            const assigned = sku.consumedUnits;
            const price = PRICING_MAP[sku.skuPartNumber] || 0;
            const cost = purchased * price;
            const consumedCost = assigned * price;
            
            purchasedCost += cost;
            assignedCost += consumedCost;
            
            console.log(`${sku.skuPartNumber}: Purchased: ${purchased}, Assigned: ${assigned}, Price: $${price}, Total Cost: $${cost}, Wasted: $${(purchased - assigned) * price}`);
        }
        
        console.log(`\nTotal Purchased Cost (True M365 Run Rate): $${purchasedCost}`);
        console.log(`Total Assigned Cost (What unified manager is calculating): $${assignedCost}`);
        console.log(`Difference (Unassigned but paid for): $${purchasedCost - assignedCost}`);

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

run();
