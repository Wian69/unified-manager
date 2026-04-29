import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

const SITE_ID = 'xxeqncs.sharepoint.com,21560bf0-53a4-4067-90c0-a711b01ea3f2,b8018860-10c2-49bf-82a7-811de2ce3c3e';

// SharePoint read-only / system fields that must never be sent in create/update calls
const READ_ONLY_FIELDS = new Set([
    'id', 'Created', 'Modified', 'AuthorLookupId', 'EditorLookupId',
    '_UIVersionString', 'Attachments', 'Edit', 'LinkTitleNoMenu', 'LinkTitle',
    'ItemChildCount', 'FolderChildCount', 'ContentType', '_ComplianceFlags',
    '_ComplianceTag', '_ComplianceTagWrittenTime', '_ComplianceTagUserId',
    '_ModerationComments', '_ModerationStatus',
]);

function stripReadOnlyFields(fields: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
        if (!READ_ONLY_FIELDS.has(key) && !key.startsWith('@') && !key.startsWith('_')) {
            clean[key] = value;
        }
    }
    return clean;
}

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

        // Strip read-only system fields before sending to Graph API
        const cleanFields = stripReadOnlyFields(body.fields || {});

        // Update the item's fields
        const response = await client.api(`/sites/${SITE_ID}/lists/${listId}/items/${itemId}/fields`)
            .update(cleanFields);

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
export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    if (!listId) {
        return NextResponse.json({ error: "Missing listId" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const client = getGraphClient();

        // Strip read-only system fields before sending to Graph API
        const cleanFields = stripReadOnlyFields(body.fields || {});

        // Create the new item
        const response = await client.api(`/sites/${SITE_ID}/lists/${listId}/items`)
            .post({
                fields: cleanFields
            });

        return NextResponse.json({
            success: true,
            item: response
        });
    } catch (error: any) {
        console.error('[API] Form Creation Error:', error.message);
        return NextResponse.json(
            { error: "Failed to create form item", details: error.message },
            { status: 500 }
        );
    }
}
