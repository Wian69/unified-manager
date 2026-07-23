import { fetchBillingData } from '@/lib/billing';
import { getItBudget } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const regionParam = searchParams.get('region');

    const data = await fetchBillingData();
    const budget = await getItBudget() as any;

    let csvContent = 'Region,Product,Price\n';
    
    // Summary Rows (only if not filtering by region)
    if (!regionParam) {
        csvContent += `GLOBAL SUMMARY,Last Invoice (Paid),$${data.lastInvoicePaid.toFixed(2)}\n`;
        csvContent += `GLOBAL SUMMARY,Projected Next Bill,$${data.projectedNextBill.toFixed(2)}\n`;
        csvContent += `,,\n`;
    }

    // Region Rows
    const mainRegions = data.regions.filter((r: any) => ['Northern Region', 'Eastern Region', 'Southern Region', 'Western Region'].includes(r.name));

    for (const region of data.regions) {
        if (regionParam && region.name !== regionParam) continue;

        // M365 Products
        for (const product of region.products) {
            csvContent += `"${region.name}","${product.name}",$${product.totalCost.toFixed(2)}\n`;
        }

        // Azure Allocation
        const isMainRegion = mainRegions.some((r: any) => r.name === region.name);
        if (isMainRegion && mainRegions.length > 0 && data.secondaryCost > 0) {
            const azureSplit = data.secondaryCost / mainRegions.length;
            csvContent += `"${region.name}","Azure Servers & Add-ons (Equal Split)",$${azureSplit.toFixed(2)}\n`;
        }

        // Manual Software allocation
        if (budget && budget.software) {
            budget.software.forEach((sw: any) => {
                if (sw.regions && sw.regions.includes(region.name)) {
                    const hasAssignedUsers = sw.assignedUsers && sw.assignedUsers.length > 0;

                    if (hasAssignedUsers) {
                        const usersInThisRegion = (sw.assignedUsers || []).filter((email: string) => region.usersList?.some((u: any) => u.email === email)).length;
                        const totalAssignedUsers = sw.assignedUsers?.length || 0;

                        if (usersInThisRegion > 0 && totalAssignedUsers > 0) {
                            const proportion = usersInThisRegion / totalAssignedUsers;
                            const swMonthlyCost = sw.interval === 'yearly' ? sw.cost / 12 : sw.cost;
                            const allocatedCost = (swMonthlyCost * sw.quantity) * proportion;
                            
                            let label = sw.name.replace(/,/g, '');
                            if (proportion >= 0.99 && region.name !== 'Southern Region') {
                                label += ' (No cost recovery to Southern Region necessary)';
                            } else {
                                label += ' (Custom Software Allocation)';
                            }
                            
                            csvContent += `"${region.name}","${label}",$${allocatedCost.toFixed(2)}\n`;
                        }
                    } else {
                        const totalUsersInSelectedRegions = data.regions
                            .filter((r: any) => sw.regions.includes(r.name))
                            .reduce((sum: number, r: any) => sum + (r.premiumUsers || 0), 0);

                        if (totalUsersInSelectedRegions > 0) {
                            const proportion = (region.premiumUsers || 0) / totalUsersInSelectedRegions;
                            const swMonthlyCost = sw.interval === 'yearly' ? sw.cost / 12 : sw.cost;
                            const allocatedCost = (swMonthlyCost * sw.quantity) * proportion;
                            
                            let label = sw.name.replace(/,/g, '');
                            if (proportion >= 0.99 && region.name !== 'Southern Region') {
                                label += ' (No cost recovery to Southern Region necessary)';
                            } else {
                                label += ' (Custom Software Allocation)';
                            }
                            
                            csvContent += `"${region.name}","${label}",$${allocatedCost.toFixed(2)}\n`;
                        }
                    }
                }
            });
        }
    }

    const filename = regionParam ? `IT_Billing_${regionParam.replace(/\s+/g, '_')}.csv` : 'Microsoft_License_Billing.csv';

    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
    });
}
