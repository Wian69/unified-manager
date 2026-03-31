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
        
        // Fetch items with fields expanded
        const response = await client.api(`/sites/${SITE_ID}/lists/${listId}/items`)
            .expand('fields')
            .get();

        return NextResponse.json({
            items: response.value || []
        });
    } catch (error: any) {
        console.error('[API] Form Items Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch form items", details: error.message },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const itemId = searchParams.get('itemId');

    if (!listId || !itemId) {
        return NextResponse.json({ error: "Missing listId or itemId" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const client = getGraphClient();

        // Update the item's fields
        const response = await client.api(`/sites/${SITE_ID}/lists/${listId}/items/${itemId}/fields`)
            .update(body.fields);

        return NextResponse.json({
            success: true,
            item: response
        });
    } catch (error: any) {
        console.error('[API] Form Update Error:', error.message);
        return NextResponse.json(
            { error: "Failed to update form item", details: error.message },
            { status: 500 }
        );
    }
}
