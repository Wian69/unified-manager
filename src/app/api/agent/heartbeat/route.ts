import { NextRequest, NextResponse } from 'next/server';
import { getAgents, saveAgents, getCommands, saveCommands } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId, serialNumber, deviceName, publicIp, localIp, isp, os, version } = body;

        if (!agentId) {
            return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
        }

        const agents: any = await getAgents();
        
        // Update or register agent
        agents[agentId] = {
            ...agents[agentId],
            serialNumber,
            deviceName,
            publicIp,
            localIp,
            isp,
            os,
            version,
            lastSeen: new Date().toISOString(),
            status: 'online'
        };

        await saveAgents(agents);

        // Check for pending commands
        const allCommands = await getCommands();
        const pendingCommands = allCommands.filter((c: any) => c.agentId === agentId && c.status === 'pending');

        // Mark commands as "delivered"
        const updatedCommands = allCommands.map((c: any) => {
            if (c.agentId === agentId && c.status === 'pending') {
                return { ...c, status: 'delivered', deliveredAt: new Date().toISOString() };
            }
            return c;
        });
        await saveCommands(updatedCommands);

        return NextResponse.json({
            success: true,
            commands: pendingCommands
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
