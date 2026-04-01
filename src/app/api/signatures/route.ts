import { NextResponse } from 'next/server';
import { getSignatureConfig, saveSignatureConfig } from '@/lib/db';

export async function GET() {
    try {
        const config = await getSignatureConfig();
        return NextResponse.json(config);
    } catch (error: any) {
        console.error('[API] Signature Load Error:', error.message);
        return NextResponse.json({ 
            error: error.message,
            details: error.details || error
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { html, name, selectedUserIds } = body;

        const config = {
            html,
            name,
            selectedUserIds
        };

        await saveSignatureConfig(config);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] Signature Save Error:', error.message);
        return NextResponse.json({ 
            error: error.message,
            details: error.details || error
        }, { status: 500 });
    }
}
