import { fetchBillingData } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET() {
    const data = await fetchBillingData();

    let csvContent = 'Region,Product,Price\n';
    
    // Summary Rows
    csvContent += `GLOBAL SUMMARY,Last Invoice (Paid),$${data.lastInvoicePaid.toFixed(2)}\n`;
    csvContent += `GLOBAL SUMMARY,Projected Next Bill,$${data.projectedNextBill.toFixed(2)}\n`;
    csvContent += `,,\n`;

    // Region Rows
    for (const region of data.regions) {
        for (const product of region.products) {
            csvContent += `"${region.name}","${product.name}",$${product.totalCost.toFixed(2)}\n`;
        }
    }

    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="Microsoft_License_Billing.csv"',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
    });
}
