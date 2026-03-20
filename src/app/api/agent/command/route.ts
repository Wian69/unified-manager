import { NextRequest, NextResponse } from 'next/server';
import { getCommands, saveCommands } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId, type, payload } = body;

        if (!agentId || !type) {
            return NextResponse.json({ error: 'agentId and type are required' }, { status: 400 });
        }

        const commands = getCommands();
        const newCommand = {
            id: crypto.randomUUID(),
            agentId,
            type,
            payload: payload || {},
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        commands.push(newCommand);
        saveCommands(commands);

        return NextResponse.json({ success: true, command: newCommand });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const allCommands = getCommands();
    const filtered = agentId 
        ? allCommands.filter((c: any) => c.agentId === agentId)
        : allCommands;

    return NextResponse.json({ commands: filtered });
}
