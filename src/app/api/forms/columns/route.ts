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
            .filter((col: any) => !col.readOnly && !col.hidden)
            .map((col: any) => ({
                id: col.id,
                name: col.name,
                displayName: col.displayName,
                type: col.text ? 'text' : col.choice ? 'choice' : col.dateTime ? 'datetime' : col.number ? 'number' : col.boolean ? 'boolean' : col.lookup ? 'lookup' : 'text',
                choices: col.choice?.choices || []
            }));

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
