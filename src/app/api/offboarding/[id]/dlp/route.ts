import { NextRequest, NextResponse } from 'next/server';
import { getDlpEvents, getAgents } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: userId } = await params;
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        console.log(`[DLP] Fetching events for user: ${userId}`);

        const client = getGraphClient();

        // 1. Get managed devices for this user from Graph
        let serials: string[] = [];
        let deviceNames: string[] = [];
        try {
            const deviceRes = await client.api(`/users/${userId}/managedDevices`)
                .select('serialNumber,deviceName')
                .get();
            
            const devices = deviceRes.value || [];
            serials = devices.map((d: any) => (d.serialNumber || "").toLowerCase().trim());
            deviceNames = devices.map((d: any) => (d.deviceName || "").toLowerCase().trim());
        } catch (graphError: any) {
            console.warn(`[DLP] Graph fetch failed for user ${userId}:`, graphError.message);
        }

        if (serials.length === 0 && deviceNames.length === 0) {
            console.log(`[DLP] No devices found for user ${userId} in Intune.`);
            return NextResponse.json({ events: [] });
        }

        // 2. Map serials/deviceNames to agentIds
        const agentsMap: any = await getAgents();
        const agentIds = Object.keys(agentsMap).filter(id => {
            const agent = agentsMap[id];
            const agentSerial = (agent.serialNumber || "").toLowerCase().trim();
            const agentName = (agent.deviceName || "").toLowerCase().trim();
            
            return serials.includes(agentSerial) || deviceNames.includes(agentName);
        });

        if (agentIds.length === 0) {
            console.log(`[DLP] Devices found (${deviceNames.join(',')}) but no active Enterprise Agents matched.`);
            return NextResponse.json({ events: [] });
        }

        // 3. Filter all DLP events by these matched agentIds
        const allEvents = await getDlpEvents();
        const userEvents = allEvents.filter(e => agentIds.includes(e.agentId));

        console.log(`[DLP] Returning ${userEvents.length} events for user ${userId}`);

        return NextResponse.json({ 
            events: userEvents,
            mappedDevices: serials 
        });
    } catch (error: any) {
        console.error('[API] DLP Fetch Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: agentId } = await params;
        const body = await req.json();
        const { type, payload, severity = 'high' } = body;

        console.log(`[DLP] Received event from agent ${agentId}: ${type}`);

        const { saveDlpEvents, getDlpEvents } = require('@/lib/db');
        const events = await getDlpEvents();
        
        const newEvent = {
            id: `dlp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            agentId: agentId,
            type: type || 'GENERAL_EVENT',
            details: typeof payload === 'string' ? payload : (payload.output || payload.text || JSON.stringify(payload)),
            severity: severity,
            timestamp: new Date().toISOString()
        };

        // Handle specific screenshot payloads for the UI
        if (type === 'COMMAND_RESULT' && payload.type === 'SCREENSHOT' && payload.output) {
            newEvent.type = 'security_snapshot';
            newEvent.details = `Instant Forensic Capture | ${payload.output}`; // UI expects Base64 after |
        } else if (type === 'COMMAND_RESULT' && payload.type === 'shell') {
            newEvent.type = 'discovery_result';
            newEvent.details = payload.output || 'No output.';
        }

        events.push(newEvent);
        await saveDlpEvents(events);

        return NextResponse.json({ success: true, eventId: newEvent.id });
    } catch (error: any) {
        console.error('[API] DLP Post Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
