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
            azureRunRate: data.secondaryCost
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
                    content: `<!DOCTYPE html>
<html>
<head>
<meta>
<title>Equinox Group Holdings IT Recoveryt</title>
<style>
body {
font-family: Arial, Helvetica, sans-serif;
background-color: #f4f6f8;
color: #333;
margin: 0;
padding: 40px;
}
.email-container {
max-width: 650px;
background-color: #ffffff;
border: 1px solid #d9e1ec;
border-radius: 8px;
padding: 30px 40px;
margin: 0 auto;
box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
h2 {
color: #0d3c61;
text-align: center;
margin-top: 0;
}
p {
line-height: 1.6;
margin: 8px 0;
}
strong {
color: #0d3c61;
}
.logo {
text-align: center;
margin-top: 30px;
}
.footer {
color: #888888;
font-size: smaller;
font-style: italic;
margin-top: 30px;
line-height: 1.4;
}
.notice {
background-color: #f0f4f8;
border-left: 4px solid #0d3c61;
padding: 10px 15px;
margin-top: 20px;
font-size: 13px;
color: #555;
}
</style>
</head>
<body>
<div class="email-container">
<h2>Request Completed</h2>
<p><strong>Good Day,</strong></p>
<p>Please see the attached cost recoviers to the Southern Region.</p>
<p><strong>Equinox Group Holdings IT Support</strong></p>
<div class="logo">
<img src="https://eqncs.com/2025/html/images/logo.png" alt="Company Logo" width="180">
</div>
<div class="notice">
<strong>Note:</strong> This is an automated message sent from an unattended mailbox. Please do not reply, as responses to this email address are not monitored.
</div>
<p class="footer">
This message is intended solely for the addressee and may contain confidential
information. If you have received this message in error, please notify us
immediately and permanently delete it. Do not use, copy, or disclose the
information contained in this message or in any attachment.
</p>
</div>
</body>
</html>`
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
