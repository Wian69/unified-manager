import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

const SITE_ID = 'xxeqncs.sharepoint.com,21560bf0-53a4-4067-90c0-a711b01ea3f2,b8018860-10c2-49bf-82a7-811de2ce3c3e';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    if (!listId) {
        return NextResponse.json({ error: "Missing listId" }, { status: 400 });
    }

    try {
        const client = getGraphClient();
        
        // Fetch columns to understand the schema
        const response = await client.api(`/sites/${SITE_ID}/lists/${listId}/columns`)
            .get();

        // Filter and simplify columns for the UI
        const columns = (response.value || [])
            .filter((col: any) => (!col.readOnly || col.name === 'Created') && !col.hidden)
            .map((col: any) => ({
                id: col.id,
                name: col.name,
                displayName: col.displayName,
                type: col.text ? 'text' : col.choice ? 'choice' : col.dateTime ? 'datetime' : col.number ? 'number' : col.boolean ? 'boolean' : col.lookup ? 'lookup' : 'text',
                choices: col.choice?.choices || []
            }));

        // IT Support List Custom Order
        if (listId === 'ec7c28b2-d2bc-4d99-8550-499f385fd58d') {
            const order = [
                'TicketNumber',
                'Title',
                'NameSurname',
                'Region',
                'Department',
                'TechnicalIssue',
                'DateTime',
                'Status',
                'Comments'
            ];
            columns.sort((a: any, b: any) => {
                const indexA = order.indexOf(a.name);
                const indexB = order.indexOf(b.name);
                if (indexA === -1 && indexB === -1) return 0;
                if (indexA === -1) return -1; // Unspecified columns go before the final status/comments block
                if (indexB === -1) return 1;
                return indexA - indexB;
            });
        }

        return NextResponse.json({
            columns
        });
    } catch (error: any) {
        console.error('[API] Form Columns Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch form columns", details: error.message },
            { status: 500 }
        );
    }
}
