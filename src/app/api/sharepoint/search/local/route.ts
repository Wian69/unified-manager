import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getCommands, saveCommands, getResults } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const poll = searchParams.get('poll');

    if (!query) {
        return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // 1. Polling Mode: Check if any agent has reported results for this query
    if (poll) {
        try {
            const allResults = await getResults();
            const localHits: any[] = [];
            
            // Iterate through results to find LocalSearch hits matching the query
            Object.entries(allResults).forEach(([agentId, data]: [string, any]) => {
                if (data.type === 'LocalSearch' && data.data) {
                    try {
                        const files = JSON.parse(data.data);
                        if (Array.isArray(files)) {
                            files.forEach(f => {
                                // Double check if it matches the keyword (case-insensitive)
                                if (f.Name.toLowerCase().includes(query.toLowerCase()) || 
                                    f.FullName.toLowerCase().includes(query.toLowerCase())) {
                                    localHits.push({
                                        ...f,
                                        agentId,
                                        deviceName: "Remote PC" // We'll improve this with actual device name if possible
                                    });
                                }
                            });
                        }
                    } catch (e) { /* Ignore parse errors */ }
                }
            });

            return NextResponse.json({ results: localHits });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    // 2. Trigger Mode: Queue commands for all online agents
    try {
        const agents = await getAgents();
        const now = Date.now();
        const onlineAgents = Object.values(agents as any).filter((a: any) => (now - a.lastSeen) < 60000);

        if (onlineAgents.length === 0) {
            return NextResponse.json({ message: 'No agents currently online to perform deep scan', count: 0 });
        }

        const commands = await getCommands();
        const newCommands = onlineAgents.map((a: any) => ({
            id: Math.random().toString(36).substring(2, 15),
            agentId: a.agentId,
            type: 'LocalSearch',
            payload: { keyword: query },
            status: 'queued',
            timestamp: now
        }));

        await saveCommands([...commands, ...newCommands]);

        return NextResponse.json({ 
            message: `Deep scan initiated on ${onlineAgents.length} PCs`, 
            count: onlineAgents.length 
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
