import { NextResponse } from 'next/server';
import { getAzureArmToken } from '@/lib/billing';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const armToken = await getAzureArmToken();
        
        let endDate = searchParams.get('endDate');
        let startDate = searchParams.get('startDate');

        if (!endDate || !startDate) {
            // Default to last 12 months
            endDate = new Date().toISOString().split('T')[0];
            startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        
        // Primary Invoice (M365 & MCA)
        const primaryAccount = "3fb97818-dfe8-510b-d0f3-be60a5e3e49d:2a308a52-20c8-40e3-b8fd-275e23cf57e6_2019-05-31";
        const primaryProfile = "LMWI-D26L-BG7-PGB";
        const invoiceUrl = `https://management.azure.com/providers/Microsoft.Billing/billingAccounts/${primaryAccount}/billingProfiles/${primaryProfile}/invoices?api-version=2020-05-01&periodStartDate=${startDate}&periodEndDate=${endDate}`;
        
        const res = await fetch(invoiceUrl, { 
            headers: { Authorization: `Bearer ${armToken}` },
            cache: 'no-store'
        });
        
        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch invoices from Azure' }, { status: res.status });
        }
        
        const data = await res.json();
        
        const invoices = (data.value || []).map((inv: any) => ({
            id: inv.name,
            invoiceDate: inv.properties.invoiceDate,
            dueDate: inv.properties.dueDate,
            status: inv.properties.status,
            amount: inv.properties.totalAmount?.value || 0,
            currency: inv.properties.totalAmount?.currency || 'USD',
            pdfUrl: inv.properties.documentUrl || null
        })).sort((a: any, b: any) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

        return NextResponse.json({ invoices });
    } catch (e: any) {
        console.error("Error fetching invoice history:", e);
        return NextResponse.json({ error: e.message || 'Unknown error occurred' }, { status: 500 });
    }
}
