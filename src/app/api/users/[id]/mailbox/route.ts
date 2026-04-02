import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const client = getGraphClient();
        
        // Fetch mailbox settings (requires MailboxSettings.ReadWrite)
        const settings = await client.api(`/users/${id}/mailboxSettings`).get();
        
        return NextResponse.json(settings);
    } catch (error: any) {
        console.error(`[API] Fetch Mailbox Settings Error for ${id}:`, error.message);
        return NextResponse.json(
            { error: "Failed to fetch mailbox settings", details: error.message },
            { status: error.statusCode || 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        console.log(`[API] Updating Mailbox Settings for ${id}:`, JSON.stringify(body, null, 2));
        const client = getGraphClient();
        
        // Update automaticRepliesSetting
        // body should be { automaticRepliesSetting: { ... } }
        const result = await client.api(`/users/${id}/mailboxSettings`).update(body);
        
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error(`[API] Update Mailbox Settings Error for ${id}:`, error.message);
        return NextResponse.json(
            { error: "Failed to update mailbox settings", details: error.message },
            { status: error.statusCode || 500 }
        );
    }
}
