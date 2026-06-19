import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch setting definitions for the 'MSS Legacy' category
        const templateId = "034ccd46-190c-4afc-adf1-ad7cc11262eb";
        const categoryId = "56eb7dbe-3f32-4168-8715-e03912098f15";
        const response = await client.api(`/deviceManagement/templates/${templateId}/categories/${categoryId}/settingDefinitions`)
            .version('beta')
            .get();

        return NextResponse.json(response.value || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
