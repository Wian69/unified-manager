import { getGraphClient } from './graph';
import { ClientSecretCredential } from '@azure/identity';

const PRICING_MAP: Record<string, number> = {
    "SPB": 22.00,
    "AAD_PREMIUM_P2": 9.00,
    "EXCHANGESTANDARD": 4.00,
    "EXCHANGEENTERPRISE": 8.00,
    "POWER_BI_STANDARD": 10.00
};

const FRIENDLY_NAME_MAP: Record<string, string> = {
    "SPB": "Microsoft 365 Business Premium",
    "AAD_PREMIUM_P2": "Microsoft Entra ID P2",
    "EXCHANGESTANDARD": "Exchange Online (Plan 1)",
    "EXCHANGEENTERPRISE": "Exchange Online (Plan 2)",
    "POWER_BI_STANDARD": "Power BI Pro",
    "FLOW_FREE": "Power Automate Free",
    "POWERAPPS_DEV": "Power Apps Developer",
    "CCIBOTS_PRIVPREV_VIRAL": "Copilot Studio (Preview)"
};

async function getAzureArmToken() {
    const tenantId = process.env.AZURE_TENANT_ID!;
    const clientId = process.env.AZURE_CLIENT_ID!;
    const clientSecret = process.env.AZURE_CLIENT_SECRET!;
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const token = await credential.getToken("https://management.azure.com/.default");
    return token.token;
}

export async function fetchBillingData() {
    const graphClient = getGraphClient();
    
    // 1. Fetch Subscribed SKUs for mapping
    const skusRes = await graphClient.api('/subscribedSkus').get();
    const skuMap: Record<string, string> = {};
    for (const sku of skusRes.value) {
        skuMap[sku.skuId] = sku.skuPartNumber;
    }

    // 2. Fetch Users
    let users: any[] = [];
    let url = '/users?$select=id,displayName,userPrincipalName,assignedLicenses,officeLocation';
    while (url) {
        const response = await graphClient.api(url).get();
        if (response.value) users.push(...response.value);
        url = response['@odata.nextLink'] || null;
    }

    // 3. Fetch Azure Billing Data
    let primaryTotal = 0;
    let secondaryTotal = 0;
    
    try {
        const armToken = await getAzureArmToken();
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Primary Invoice (M365)
        const primaryAccount = "3fb97818-dfe8-510b-d0f3-be60a5e3e49d:2a308a52-20c8-40e3-b8fd-275e23cf57e6_2019-05-31";
        const primaryProfile = "LMWI-D26L-BG7-PGB";
        const invoiceUrl = `https://management.azure.com/providers/Microsoft.Billing/billingAccounts/${primaryAccount}/billingProfiles/${primaryProfile}/invoices?api-version=2020-05-01&periodStartDate=${startDate}&periodEndDate=${endDate}`;
        
        const invRes = await fetch(invoiceUrl, { headers: { Authorization: `Bearer ${armToken}` } });
        if (invRes.ok) {
            const invData = await invRes.json();
            const recentInvoices = (invData.value || [])
                .sort((a: any, b: any) => new Date(b.properties.invoiceDate).getTime() - new Date(a.properties.invoiceDate).getTime())
                .slice(0, 4);
            primaryTotal = recentInvoices.reduce((sum: number, inv: any) => sum + (inv.properties.totalAmount?.value || 0), 0);
        }

        // Secondary Subscription (Azure)
        const secondaryAccount = "3fb97818-dfe8-510b-d0f3-be60a5e3e49d:aedfb1e5-5c75-47f9-8bc6-077a0c21df7c_2019-05-31";
        const secondaryProfile = "GAAA-MHOD-BG7-PGB";
        const subUrl = `https://management.azure.com/providers/Microsoft.Billing/billingAccounts/${secondaryAccount}/billingProfiles/${secondaryProfile}/billingSubscriptions?api-version=2020-05-01`;
        
        const subRes = await fetch(subUrl, { headers: { Authorization: `Bearer ${armToken}` } });
        if (subRes.ok) {
            const subData = await subRes.json();
            secondaryTotal = (subData.value || []).reduce((sum: number, sub: any) => sum + (sub.properties.lastMonthCharges?.value || 0), 0);
        }
    } catch (err) {
        console.error("Error fetching Azure Billing Data via ARM REST:", err);
        // Silently continue if ARM billing fails, so users list still works
    }

    // 4. Group by Region
    const regionGroups: Record<string, { usersCount: number, totalCost: number, products: Record<string, { unitPrice: number, users: string[] }> }> = {};

    for (const user of users) {
        let regionName = user.officeLocation;
        if (user.userPrincipalName?.endsWith('@partner.eqncs.com')) {
            regionName = "Sub Contractors";
        } else if (!regionName) {
            regionName = "Unassigned Region";
        }

        if (!regionGroups[regionName]) {
            regionGroups[regionName] = { usersCount: 0, totalCost: 0, products: {} };
        }

        regionGroups[regionName].usersCount++;

        if (user.assignedLicenses && user.assignedLicenses.length > 0) {
            for (const license of user.assignedLicenses) {
                let rawSku = skuMap[license.skuId] || license.skuId;
                const productName = FRIENDLY_NAME_MAP[rawSku] || rawSku;
                const unitPrice = PRICING_MAP[rawSku] || 0.00;

                if (!regionGroups[regionName].products[productName]) {
                    regionGroups[regionName].products[productName] = { unitPrice, users: [] };
                }
                regionGroups[regionName].products[productName].users.push(user.userPrincipalName);
                regionGroups[regionName].totalCost += unitPrice;
            }
        } else {
            if (!regionGroups[regionName].products["No Licenses Assigned"]) {
                regionGroups[regionName].products["No Licenses Assigned"] = { unitPrice: 0.00, users: [] };
            }
            regionGroups[regionName].products["No Licenses Assigned"].users.push(user.userPrincipalName);
        }
    }

    // Calculate overall M365 Run Rate
    let calculatedM365RunRate = 0;
    const structuredRegions = [];
    
    for (const [regionName, group] of Object.entries(regionGroups)) {
        calculatedM365RunRate += group.totalCost;
        
        const structuredProducts = [];
        for (const [productName, pGroup] of Object.entries(group.products)) {
            structuredProducts.push({
                name: productName,
                unitPrice: pGroup.unitPrice,
                totalCost: pGroup.unitPrice * pGroup.users.length,
                users: pGroup.users
            });
        }

        structuredRegions.push({
            name: regionName,
            totalUsers: group.usersCount,
            totalCost: group.totalCost,
            products: structuredProducts
        });
    }

    return {
        totalAmount: primaryTotal + secondaryTotal,
        primaryCost: primaryTotal,
        secondaryCost: secondaryTotal,
        calculatedM365RunRate,
        projectedNextBill: calculatedM365RunRate + secondaryTotal,
        lastInvoicePaid: primaryTotal + secondaryTotal,
        generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        regions: structuredRegions
    };
}
