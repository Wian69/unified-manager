import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string, attachmentId: string }> }
) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    // Using await params is required in next 15+ 
    const resolvedParams = await params;
    const messageId = resolvedParams.id;
    const attachmentId = resolvedParams.attachmentId;

    if (!userId || !messageId || !attachmentId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    try {
        const client = getGraphClient();
        
        const attachment = await client.api(`/users/${userId}/messages/${messageId}/attachments/${attachmentId}`)
            .get();

        if (attachment['@odata.type'] === '#microsoft.graph.fileAttachment') {
            const buffer = Buffer.from(attachment.contentBytes, 'base64');
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': attachment.contentType || 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${attachment.name}"`
                }
            });
        } else if (attachment['@odata.type'] === '#microsoft.graph.itemAttachment') {
            // It's an attached message or contact.
            return NextResponse.json({ error: "Item attachments are not supported for direct download." }, { status: 400 });
        } else {
            return NextResponse.json({ error: "Unsupported attachment type" }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[API] Attachment Fetch Error:', error.message);
        return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 500 });
    }
}
