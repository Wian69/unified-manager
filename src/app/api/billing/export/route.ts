import { NextResponse } from 'next/server';
import { fetchBillingData } from '@/lib/billing';
import { generateInvoicePdf } from '@/lib/pdfGenerator';
import kv from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const regionParam = searchParams.get('region');

    try {
        const data = await fetchBillingData();
        const budget = await kv.get('budget_data') || { totalMonthlyBudget: 25000, software: [], hardware: [] };
        
        // Ensure we have azureRunRate accessible
        const enhancedBudget = {
            ...(budget as any),
            azureRunRate: data.azureRunRate
        };

        if (regionParam) {
            // Validate region exists
            const regionExists = data.regions.some((r: any) => r.name === regionParam);
            if (!regionExists) {
                return NextResponse.json({ error: 'Region not found' }, { status: 404 });
            }

            const pdfBuffer = await generateInvoicePdf(regionParam, data, enhancedBudget);

            return new NextResponse(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="Invoice_${regionParam.replace(/\s+/g, '_')}.pdf"`
                }
            });
        }

        return NextResponse.json({ error: 'Region parameter is required for PDF generation.' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
