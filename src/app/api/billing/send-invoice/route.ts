import { fetchBillingData } from '@/lib/billing';
import { getItBudget } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { region, toEmail, fromEmail } = body;

        if (!region || !toEmail || !fromEmail) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        const data = await fetchBillingData();
        const budget = await getItBudget() as any;

        const mainRegions = data.regions.filter((r: any) => ['Northern Region', 'Eastern Region', 'Southern Region', 'Western Region'].includes(r.name));

        let csvContent = 'Region,Product,Price\n';
        let regionTotalCost = 0;
        let foundRegion = false;

        for (const r of data.regions) {
            if (r.name !== region) continue;
            foundRegion = true;

            // M365 Products
            for (const product of r.products) {
                csvContent += `"${r.name}","${product.name}",$${product.totalCost.toFixed(2)}\n`;
                regionTotalCost += product.totalCost;
            }

            // Azure Allocation
            const isMainRegion = mainRegions.some((m: any) => m.name === r.name);
            if (isMainRegion && mainRegions.length > 0 && data.secondaryCost > 0) {
                const azureSplit = data.secondaryCost / mainRegions.length;
                csvContent += `"${r.name}","Azure Servers & Add-ons (Equal Split)",$${azureSplit.toFixed(2)}\n`;
                regionTotalCost += azureSplit;
            }

            // Manual Software allocation
            if (budget && budget.software) {
                budget.software.forEach((sw: any) => {
                    if (sw.regions && sw.regions.includes(r.name)) {
                        const hasAssignedUsers = sw.assignedUsers && sw.assignedUsers.length > 0;

                        if (hasAssignedUsers) {
                            const usersInThisRegion = (sw.assignedUsers || []).filter((email: string) => r.usersList?.some((u: any) => u.email === email)).length;
                            const totalAssignedUsers = sw.assignedUsers?.length || 0;

                            if (usersInThisRegion > 0 && totalAssignedUsers > 0) {
                                const proportion = usersInThisRegion / totalAssignedUsers;
                                const swMonthlyCost = sw.interval === 'yearly' ? sw.cost / 12 : sw.cost;
                                const allocatedCost = (swMonthlyCost * sw.quantity) * proportion;
                                
                                regionTotalCost += allocatedCost;
                                csvContent += `"${r.name}","${sw.name} (Custom Software Allocation)",$${allocatedCost.toFixed(2)}\n`;
                            }
                        } else {
                            const totalUsersInSelectedRegions = data.regions
                                .filter((rx: any) => sw.regions.includes(rx.name))
                                .reduce((sum: number, rx: any) => sum + (rx.premiumUsers || 0), 0);

                            if (totalUsersInSelectedRegions > 0) {
                                const proportion = (r.premiumUsers || 0) / totalUsersInSelectedRegions;
                                const swMonthlyCost = sw.interval === 'yearly' ? sw.cost / 12 : sw.cost;
                                const allocatedCost = (swMonthlyCost * sw.quantity) * proportion;
                                
                                regionTotalCost += allocatedCost;
                                csvContent += `"${r.name}","${sw.name} (Custom Software Allocation)",$${allocatedCost.toFixed(2)}\n`;
                            }
                        }
                    }
                });
            }
        }

        if (!foundRegion) {
            return new Response(JSON.stringify({ error: 'Region not found' }), { status: 404 });
        }

        // Send Email via MS Graph
        const graphClient = getGraphClient();
        const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const message = {
            subject: `Equinox IT Cost Recovery Invoice - ${region} - ${monthYear}`,
            body: {
                contentType: 'HTML',
                content: `
                    <h2>IT Cost Recovery Invoice</h2>
                    <p><strong>Region:</strong> ${region}</p>
                    <p><strong>Billing Period:</strong> ${monthYear}</p>
                    <p><strong>Total Cost Recovery Amount:</strong> $${regionTotalCost.toFixed(2)}</p>
                    <br/>
                    <p>Please find the detailed line-item breakdown of your Microsoft 365, Azure, and Custom Software costs attached as a CSV file.</p>
                    <p>If you have any questions about this billing statement, please contact IT.</p>
                `
            },
            toRecipients: [
                { emailAddress: { address: toEmail } }
            ],
            attachments: [
                {
                    '@odata.type': '#microsoft.graph.fileAttachment',
                    name: `IT_Billing_${region.replace(/\s+/g, '_')}_${monthYear}.csv`,
                    contentBytes: Buffer.from(csvContent).toString('base64')
                }
            ]
        };

        await graphClient.api(`/users/${fromEmail}/sendMail`).post({
            message,
            saveToSentItems: true
        });

        return new Response(JSON.stringify({ success: true, totalCost: regionTotalCost }), { status: 200 });

    } catch (error: any) {
        console.error("Failed to send email invoice:", error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}
