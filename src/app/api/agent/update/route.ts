import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const agentPath = path.join(process.cwd(), 'agent', 'unified-agent.ps1');
        const content = fs.readFileSync(agentPath, 'utf-8');
        
        // Extract version from file header or use a hardcoded fallback
        // The script header looks like: # Version: 1.2.0
        const versionMatch = content.match(/# Version: ([\d.]+)/);
        const version = versionMatch ? versionMatch[1] : '1.1.2';

        return new Response(content, {
            headers: {
                'Content-Type': 'text/plain',
                'X-Agent-Version': version,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Agent file not found" }, { status: 404 });
    }
}
