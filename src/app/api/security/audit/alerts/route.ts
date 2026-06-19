import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch active security alerts
        const response = await client.api('/security/alerts')
            .version('beta')
            .top(10)
            .get();

        const alerts = response.value || [];

        return NextResponse.json({
            count: alerts.length,
            alerts: alerts.map((a: any) => ({
                title: a.title,
                severity: a.severity,
                status: a.status,
                category: a.category,
                eventTime: a.eventDateTime
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
