import { NextResponse } from 'next/server';
import { fetchBillingData } from '@/lib/billing';
import { generateInvoicePdf } from '@/lib/pdfGenerator';
import { getItBudget } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { region, toEmail, fromEmail } = body;

        if (!region || !toEmail || !fromEmail) {
            return NextResponse.json({ error: 'Missing required fields: region, toEmail, or fromEmail' }, { status: 400 });
        }

        const data = await fetchBillingData();
        const budget = await getItBudget() || { totalMonthlyBudget: 25000, software: [], hardware: [] };
        
        // Ensure we have azureRunRate accessible
        const enhancedBudget = {
            ...(budget as any),
            azureRunRate: data.azureRunRate
        };

        const regionExists = data.regions.some((r: any) => r.name === region);
        if (!regionExists) {
            return NextResponse.json({ error: 'Region not found in billing data' }, { status: 404 });
        }

        const pdfBuffer = await generateInvoicePdf(region, data, enhancedBudget);

        // Calculate total amount for the email body
        // We can just query it from our logic, or simply state "See attached invoice for details."
        let totalAmount = 0;
        // Let's quickly re-calculate total just for the email body text
        const mainRegions = data.regions.filter((r: any) => ['Northern Region', 'Eastern Region', 'Southern Region', 'Western Region'].includes(r.name));
        const isMainRegion = mainRegions.some((r: any) => r.name === region);
        if (isMainRegion && mainRegions.length > 0 && enhancedBudget.azureRunRate > 0) totalAmount += enhancedBudget.azureRunRate / mainRegions.length;
        
        const regionData = data.regions.find((r: any) => r.name === region);
        if (regionData && regionData.products) {
            for (const p of regionData.products) totalAmount += p.totalCost;
        }

        if (enhancedBudget.software) {
            enhancedBudget.software.forEach((sw: any) => {
                if (sw.regions && sw.regions.includes(region)) {
                    const hasAssignedUsers = sw.assignedUsers && sw.assignedUsers.length > 0;
                    if (hasAssignedUsers) {
                        const usersInThisRegion = (sw.assignedUsers || []).filter((email: string) => regionData?.usersList?.some((u: any) => u.email === email)).length;
                        const totalAssignedUsers = sw.assignedUsers?.length || 0;
                        if (usersInThisRegion > 0 && totalAssignedUsers > 0) {
                            totalAmount += (sw.interval === 'yearly' ? sw.cost / 12 : sw.cost) * sw.quantity * (usersInThisRegion / totalAssignedUsers);
                        }
                    } else {
                        const totalUsersInSelectedRegions = data.regions
                            .filter((rx: any) => sw.regions.includes(rx.name))
                            .reduce((sum: number, rx: any) => sum + (rx.premiumUsers || 0), 0);
                        if (totalUsersInSelectedRegions > 0) {
                            totalAmount += (sw.interval === 'yearly' ? sw.cost / 12 : sw.cost) * sw.quantity * ((regionData?.premiumUsers || 0) / totalUsersInSelectedRegions);
                        }
                    }
                }
            });
        }

        const message = {
            message: {
                subject: `IT Billing Invoice: ${region}`,
                body: {
                    contentType: "HTML",
                    content: `
                        <h2>IT Billing Invoice</h2>
                        <p>Hello,</p>
                        <p>Please find attached the IT billing invoice and cost allocation for <strong>${region}</strong>.</p>
                        <p><strong>Total Allocated Cost: $${totalAmount.toFixed(2)}</strong></p>
                        <p>Thank you,</p>
                        <p>IT Department</p>
                    `
                },
                toRecipients: [
                    { emailAddress: { address: toEmail } }
                ],
                attachments: [
                    {
                        "@odata.type": "#microsoft.graph.fileAttachment",
                        name: `Invoice_${region.replace(/\s+/g, '_')}.pdf`,
                        contentType: "application/pdf",
                        contentBytes: pdfBuffer.toString('base64')
                    }
                ]
            },
            saveToSentItems: "true"
        };

        const client = getGraphClient();
        await client.api(`/users/${fromEmail}/sendMail`).post(message);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Unknown error occurred' }, { status: 500 });
    }
}
