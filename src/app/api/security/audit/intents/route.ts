import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch all security intents (these are the baseline deployments)
        const response = await client.api('/deviceManagement/intents')
            .version('beta')
            .get();

        const intents = response.value || [];

        return NextResponse.json({
            count: intents.length,
            intents: intents.map((i: any) => ({
                name: i.displayName,
                id: i.id,
                templateId: i.templateId
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
