import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch active security incidents (Unified Defender XDR)
        const response = await client.api('/security/incidents')
            .version('beta')
            .top(10)
            .get();

        const incidents = response.value || [];

        return NextResponse.json({
            count: incidents.length,
            incidents: incidents.map((i: any) => ({
                id: i.id,
                title: i.displayName,
                severity: i.severity,
                status: i.status,
                category: i.classification,
                created: i.createdDateTime
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
