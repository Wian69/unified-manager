import { NextResponse } from 'next/server';
import { getAgents } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    const isProd = (process.env.STORAGE_URL !== undefined) || (process.env.KV_URL !== undefined);
    const isVercel = process.env.VERCEL === '1';
    let agents: any = null;
    let error: string | null = null;

    try {
        agents = await getAgents();
    } catch (err: any) {
        error = err.message;
    }

    return NextResponse.json({
        diagnostics: {
            environment: isVercel ? 'Vercel' : 'Local',
            kvConnected: isProd,
            usingPrefix: process.env.STORAGE_URL ? 'STORAGE' : 'KV',
            storageUrlPresent: !!process.env.STORAGE_URL,
            kvUrlPresent: !!process.env.KV_URL,
        },
        data: {
            agentsCount: agents ? Object.keys(agents).length : 0,
            error: error
        }
    });
}
