import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate'); // ISO format
    const endDate = searchParams.get('endDate');   // ISO format
    const folder = searchParams.get('folder') || 'sentitems'; // 'inbox' or 'sentitems'

    if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    try {
        const client = getGraphClient();
        
        // Use receivedDateTime for inbox, sentDateTime for sent items
        const timeField = folder === 'inbox' ? 'receivedDateTime' : 'sentDateTime';
        
        let filter = "";
        if (startDate && endDate) {
            filter = `${timeField} ge ${startDate} and ${timeField} le ${endDate}`;
        }

        const response = await client.api(`/users/${userId}/mailFolders('${folder}')/messages`)
            .select(`id,subject,sentDateTime,receivedDateTime,bodyPreview,hasAttachments,from,toRecipients`)
            .expand('attachments($select=name,contentType,size)')
            .filter(filter)
            .top(100)
            .orderby(`${timeField} desc`)
            .get();

        return NextResponse.json({
            data: response.value || [],
        });
    } catch (error: any) {
        console.error('[API] Email Trace Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch email trace", details: error.message },
            { status: 500 }
        );
    }
}
