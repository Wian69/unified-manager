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
        // Note: Using search/filter to find devices assigned to this userId
        let serials: string[] = [];
        try {
            const deviceRes = await client.api('/deviceManagement/managedDevices')
                .filter(`userId eq '${userId}'`)
                .select('serialNumber')
                .get();
            
            serials = (deviceRes.value || []).map((d: any) => (d.serialNumber || "").toLowerCase().trim());
        } catch (graphError: any) {
            console.warn(`[DLP] Graph fetch failed for user ${userId}:`, graphError.message);
            // Fallback: If Graph fails, we might still have agentId if we could map it elsewhere, 
            // but usually Graph is our source of truth for user->device mapping.
        }

        if (serials.length === 0) {
            console.log(`[DLP] No devices found for user ${userId} in Intune.`);
            return NextResponse.json({ events: [] });
        }

        // 2. Map serials to agentIds from our local/Supabase DB
        const agentsMap: any = await getAgents();
        const agentIds = Object.keys(agentsMap).filter(id => {
            const agentSerial = (agentsMap[id].serialNumber || "").toLowerCase().trim();
            return serials.includes(agentSerial);
        });

        if (agentIds.length === 0) {
            console.log(`[DLP] Devices found (${serials.join(',')}) but no active Enterprise Agents matched.`);
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
