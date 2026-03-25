import { NextRequest, NextResponse } from 'next/server';
import { getDlpEvents, getAgents } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const events = await getDlpEvents();
        const agents = await getAgents();
        
        return NextResponse.json({
            meta: {
                eventCount: events.length,
                agentCount: Object.keys(agents).length,
                timestamp: new Date().toISOString()
            },
            agents: agents,
            rawEvents: events.slice(-50) // Last 50 events
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
