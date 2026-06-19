import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch categories for the MDM Security Baseline
        const templateId = "034ccd46-190c-4afc-adf1-ad7cc11262eb";
        const response = await client.api(`/deviceManagement/templates/${templateId}/categories`)
            .version('beta')
            .get();

        return NextResponse.json(response.value || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
