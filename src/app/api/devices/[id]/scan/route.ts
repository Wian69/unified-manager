import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getCommands, saveCommands } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: userId } = await params;
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
            return NextResponse.json({ error: `Graph Error: ${graphError.message}` }, { status: 500 });
        }
        
        if (serials.length === 0 && deviceNames.length === 0) {
            return NextResponse.json({ error: 'No Intune-managed devices found for this user.' }, { status: 404 });
        }

        // 2. Map serials or deviceNames to agentIds
        const agentsMap: any = await getAgents();
        const agentId = Object.keys(agentsMap).find(id => {
            const agent = agentsMap[id];
            const agentSerial = (agent.serialNumber || "").toLowerCase().trim();
            const agentName = (agent.deviceName || "").toLowerCase().trim();
            
            return serials.includes(agentSerial) || deviceNames.includes(agentName);
        });

        if (!agentId) {
            return NextResponse.json({ 
                error: `Agent not found. Found Intune devices (${deviceNames.join(', ')}) but none have the Unified Agent installed.` 
            }, { status: 404 });
        }

        // 3. Queue Forensic Command
        const body = await req.json().catch(() => ({}));
        const commandType = body.type || 'SCAN_DEVICE';
        const payload = body.payload || {};

        const allCommands = await getCommands();
        const newCommand = {
            id: crypto.randomUUID(),
            agentId,
            type: commandType,
            payload,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        await saveCommands([...allCommands, newCommand]);

        return NextResponse.json({ success: true, commandId: newCommand.id, type: commandType });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
