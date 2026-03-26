import { NextRequest, NextResponse } from 'next/server';
import { getAgents, saveAgents, getCommands, saveCommands } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId, serialNumber, deviceName, publicIp, localIp, isp, os, version } = body;
        console.log(`[HB] Incoming: ID=${agentId}, Serial=${serialNumber}, Name=${deviceName}`);

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
            lastLog: body.lastLog,
            netInfo: body.netInfo,
            lastSeen: new Date().toISOString(),
            status: 'online'
        };

        await saveAgents(agents);

        // Force upgrade all agents to v3.0.0 (Forensic Reconstruction)
        let latestVersion = "3.0.0";
        try {
            const agentPath = path.join(process.cwd(), 'agent', 'unified-agent.ps1');
            if (fs.existsSync(agentPath)) {
                const content = fs.readFileSync(agentPath, 'utf-8');
                const match = content.match(/# Version: ([\d.]+)/);
                if (match) latestVersion = match[1];
            }
        } catch (e: any) {
            console.error(`[HB] Version read error: ${e.message}`);
        }

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
            commands: pendingCommands,
            latestVersion: latestVersion
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
