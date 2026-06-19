import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch all Device Management Templates (Security Baselines, etc.)
        const response = await client.api('/deviceManagement/templates')
            .version('beta')
            .get();

        return NextResponse.json(response.value || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
