import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const agents: any = await getAgents();
        const now = new Date().getTime();
        const OFFLINE_THRESHOLD_MS = 30 * 1000; // 30 seconds

        const agentsList = Object.keys(agents).map(id => {
            const agent = agents[id];
            const lastSeenTime = agent.lastSeen ? new Date(agent.lastSeen).getTime() : 0;
            const isOnline = (now - lastSeenTime) < OFFLINE_THRESHOLD_MS;

            return {
                id,
                ...agent,
                status: isOnline ? 'online' : 'offline'
            };
        });

        return NextResponse.json({ agents: agentsList });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
