import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getCommands, saveCommands } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: userId } = await params;
        const client = getGraphClient();

        // 1. Get managed devices for this user from Graph
        let serials: string[] = [];
        try {
            const deviceRes = await client.api(`/users/${userId}/managedDevices`)
                .select('serialNumber')
                .get();
            
            serials = (deviceRes.value || []).map((d: any) => (d.serialNumber || "").toLowerCase().trim());
        } catch (graphError: any) {
            return NextResponse.json({ error: `Graph Error: ${graphError.message}` }, { status: 500 });
        }
        
        if (serials.length === 0) {
            return NextResponse.json({ error: 'No Intune-managed devices found for this user.' }, { status: 404 });
        }

        // 2. Map serials to agentIds
        const agentsMap: any = await getAgents();
        const agentId = Object.keys(agentsMap).find(id => {
            const agentSerial = (agentsMap[id].serialNumber || "").toLowerCase().trim();
            return serials.includes(agentSerial);
        });

        if (!agentId) {
            return NextResponse.json({ 
                error: `Agent not found. Found devices (${serials.join(', ')}) but none have the Unified Agent installed.` 
            }, { status: 404 });
        }

        // 3. Queue SCAN_DEVICE command
        const allCommands = await getCommands();
        const newCommand = {
            id: crypto.randomUUID(),
            agentId,
            type: 'SCAN_DEVICE',
            payload: {},
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        await saveCommands([...allCommands, newCommand]);

        return NextResponse.json({ success: true, commandId: newCommand.id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
