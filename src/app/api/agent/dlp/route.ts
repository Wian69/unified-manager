import { NextRequest, NextResponse } from 'next/server';
import { getDlpEvents, saveDlpEvents } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId, type, details, severity, timestamp } = body;

        console.log(`[DLP] Incoming Event: ${type} from Agent ${agentId}`);

        if (!agentId || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const events = await getDlpEvents();
        const newEvent = {
            id: crypto.randomUUID(),
            agentId,
            type,
            details,
            severity,
            timestamp: timestamp || new Date().toISOString()
        };

        events.push(newEvent);
        
        // Keep only last 2000 events to prevent DB bloat
        const limitedEvents = events.slice(-2000);
        await saveDlpEvents(limitedEvents);

        return NextResponse.json({ success: true, id: newEvent.id });
    } catch (error: any) {
        console.error('[DLP] Post Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
