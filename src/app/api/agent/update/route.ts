import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        const agentPath = path.join(process.cwd(), 'agent', 'unified-agent.ps1');
        const content = fs.readFileSync(agentPath, 'utf-8');
        
        // Extract version from file header or use a hardcoded fallback
        const versionMatch = content.match(/# Version: ([\d.]+)/);
        const version = versionMatch ? versionMatch[1] : '1.2.0';

        // Dynamically inject the correct Server URL from the request host!
        const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `https://${req.headers.get('host') || 'unified-manager.vercel.app'}`;
        const finalContent = content.replace(/\$ServerUrl = ".*"/, `$ServerUrl = "${host}"`);

        return new Response(finalContent, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Agent-Version': version,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Agent file not found" }, { status: 404 });
    }
}
