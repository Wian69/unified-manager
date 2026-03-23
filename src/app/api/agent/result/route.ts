import { NextRequest, NextResponse } from 'next/server';
import { getResults, saveResults } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agentId, type, data } = body;

        if (!agentId || !type) {
            return NextResponse.json({ error: 'agentId and type are required' }, { status: 400 });
        }

        const results: any = await getResults();
        
        if (!results[agentId]) {
            results[agentId] = {};
        }

        // Store latest result of each type per agent
        results[agentId][type] = {
            data,
            timestamp: new Date().toISOString()
        };

        await saveResults(results);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const type = searchParams.get('type');

    const results: any = await getResults();
    
    if (agentId) {
        const agentResults = results[agentId] || {};
        if (type) {
            return NextResponse.json({ data: agentResults[type] || null });
        }
        return NextResponse.json({ results: agentResults });
    }

    return NextResponse.json({ results });
}
