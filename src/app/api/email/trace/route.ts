import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate'); // ISO format
    const endDate = searchParams.get('endDate');   // ISO format

    if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    try {
        const client = getGraphClient();
        
        let filter = "";
        if (startDate && endDate) {
            filter = `sentDateTime ge ${startDate} and sentDateTime le ${endDate}`;
        }

        const response = await client.api(`/users/${userId}/mailFolders('sentitems')/messages`)
            .select('id,subject,sentDateTime,bodyPreview,hasAttachments')
            .expand('attachments($select=name,contentType,size)')
            .filter(filter)
            .top(100)
            .orderby('sentDateTime desc')
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
