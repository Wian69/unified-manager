import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const { id: messageId } = await params;

    if (!userId || !messageId) {
        return NextResponse.json({ error: "Missing userId or messageId" }, { status: 400 });
    }

    try {
        const client = getGraphClient();
        
        // Fetch full message including body
        const response = await client.api(`/users/${userId}/messages/${messageId}`)
            .select('id,subject,sentDateTime,body,hasAttachments,toRecipients,ccRecipients')
            .expand('attachments($select=name,contentType,size)')
            .get();

        return NextResponse.json({
            data: response,
        });
    } catch (error: any) {
        console.error('[API] Email Fetch Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch email details", details: error.message },
            { status: 500 }
        );
    }
}
