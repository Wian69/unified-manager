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

        // ----------------------------------------------------------------------
        // IT Support Ticket Email Automation
        // ----------------------------------------------------------------------
        if (listId === 'ec7c28b2-d2bc-4d99-8550-499f385fd58d' && cleanFields.Status) {
            if (cleanFields.Status === 'Work in Progress' || cleanFields.Status === 'Complete') {
                const recipientEmail = response.Email || response.Title; 
                
                if (recipientEmail && String(recipientEmail).includes('@')) {
                    // Try to use the actual TicketNumber from the SharePoint list item.
                    // Fallback to generating it based on the item ID if it doesn't exist.
                    let ticketNumber = response.TicketNumber;
                    if (!ticketNumber) {
                        const d = new Date();
                        const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
                        ticketNumber = `EQN-${dateStr}-${itemId}`;
                    }
                    
                    const htmlBody = `
<style>
body { font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f8; color: #333; margin: 0; padding: 40px; }
.email-container { max-width: 650px; background-color: #ffffff; border: 1px solid #d9e1ec; border-radius: 8px; padding: 30px 40px; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
h2 { color: #0d3c61; text-align: center; margin-top: 0; }
p { line-height: 1.6; margin: 8px 0; }
strong { color: #0d3c61; }
.logo { text-align: center; margin-top: 30px; }
.footer { color: #888888; font-size: smaller; font-style: italic; margin-top: 30px; line-height: 1.4; }
.notice { background-color: #f0f4f8; border-left: 4px solid #0d3c61; padding: 10px 15px; margin-top: 20px; font-size: 13px; color: #555; }
</style>
<div class="email-container">
<h2>IT Support Ticket Status</h2>
<p><strong>Good Day,</strong></p>
<p>Please be advised that your IT Support Ticket: <strong>${ticketNumber}</strong> has been updated to:<strong> ${cleanFields.Status}</strong></p>
<p><strong>Equinox Group IT Support Team</strong></p>
<div class="logo">
<img src="https://eqncs.com/2025/html/images/logo.png" alt="Company Logo" width="180">
</div>
<div class="notice">
<strong>Note:</strong> This is an automated message sent from an unattended mailbox. Please do not reply, as responses to this email address are not monitored.
</div>
<p class="footer">
This message is intended solely for the addressee and may contain confidential
information. If you have received this message in error, please notify us
immediately and permanently delete it. Do not use, copy, or disclose the
information contained in this message or in any attachment.
</p>
</div>`;
                    try {
                        await client.api('/users/noreply-automation@eqncs.com/sendMail').post({
                            message: {
                                subject: "Equinox Group IT Support Ticket Status",
                                body: {
                                    contentType: "HTML",
                                    content: htmlBody
                                },
                                toRecipients: [
                                    { emailAddress: { address: recipientEmail } }
                                ]
                            }
                        });
                        console.log(`[Email] Sent status update to ${recipientEmail}`);
                    } catch (mailErr: any) {
                        console.error('[Email] Failed to send status update:', mailErr.message);
                    }
                }
            }
        }
        // ----------------------------------------------------------------------

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
