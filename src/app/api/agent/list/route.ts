import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const agents = getAgents();
        const agentsList = Object.keys(agents).map(id => ({
            id,
            ...agents[id]
        }));

        return NextResponse.json({ agents: agentsList });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
