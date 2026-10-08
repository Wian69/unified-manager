import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

const SITE_ID = 'xxeqncs.sharepoint.com,21560bf0-53a4-4067-90c0-a711b01ea3f2,b8018860-10c2-49bf-82a7-811de2ce3c3e';

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
        const response = await client.api(`/sites/${SITE_ID}/lists/${listId}/items`)
            .expand('fields')
            .get();

        return NextResponse.json({ items: response.value || [] });
    } catch (error: any) {
        console.error('[API] Form Items Error:', error.message);
        return NextResponse.json({ error: "Failed to fetch form items", details: error.message }, { status: 500 });
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
        const cleanFields = stripReadOnlyFields(body.fields || {});

        let currentItem: any = null;
        try {
            currentItem = await client.api(`/sites/${SITE_ID}/lists/${listId}/items/${itemId}`).expand('fields').get();
        } catch(e) {
            console.error("Failed to fetch current item:", e);
        }

        const response = await client.api(`/sites/${SITE_ID}/lists/${listId}/items/${itemId}/fields`)
            .update(cleanFields);

        if (currentItem) {
            const commentKey = Object.keys(currentItem.fields).find(k => k.toLowerCase().includes('comment') && !k.toLowerCase().includes('user'));
            const statusKey = Object.keys(currentItem.fields).find(k => k.toLowerCase().includes('status'));
            
            const newComment = (commentKey && cleanFields[commentKey] !== undefined) ? cleanFields[commentKey] : (commentKey ? currentItem.fields[commentKey] : '');
            const oldComment = commentKey ? currentItem.fields[commentKey] : '';
            
            const newStatus = (statusKey && cleanFields[statusKey] !== undefined) ? cleanFields[statusKey] : '';
            const oldStatus = statusKey ? currentItem.fields[statusKey] : '';
            
            let statusChanged = newStatus && newStatus !== oldStatus;
            let commentChanged = newComment && newComment.trim() !== '' && newComment !== oldComment;

            if (statusChanged || commentChanged) {
                const isUserReply = body.isUserReply === true;
                const userEmail = currentItem.createdBy?.user?.email || currentItem.createdBy?.user?.userPrincipalName;
                const targetEmail = isUserReply ? 'itsupport@eqncs.com' : userEmail;
                
                if (targetEmail) {
                    const ticketNum = currentItem.fields.TicketNumber || currentItem.fields.Title || itemId;
                    
                    const displayStatus = newStatus || currentItem.fields.Status || 'Updated';
                    
                    let bodyContent = '';
                    if (isUserReply) {
                        bodyContent = `<p>Please be advised that the user has added a comment to IT Support Ticket: <strong>${ticketNum}</strong></p>`;
                    } else {
                        bodyContent = `<p>Please be advised that your IT Support Ticket: <strong>${ticketNum}</strong> has been updated to: <strong>${displayStatus}</strong></p>`;
                    }
                    
                    if (newComment && newComment.trim() !== '') {
                        // Strip any lingering HTML from old comments
                        let normalizedComment = newComment.replace(/<br\s*[\/]?>/gi, '\n')
                                                          .replace(/<\/p>/gi, '\n')
                                                          .replace(/<div[^>]*>/gi, '\n')
                                                          .replace(/<[^>]*>?/gm, '')
                                                          .trim();
                        
                        // Try splitting by double newline (new format)
                        let blocks = normalizedComment.split(/\n\s*\n/);
                        if (blocks.length === 1) {
                            // Fallback: try splitting by timestamp bracket if they are squished
                            blocks = normalizedComment.split(/(?=\[\d{1,4}[-/]\d{1,2}[-/]\d{1,4})/);
                        }
                        
                        let latestIt = null;
                        let latestUser = null;
                        for (let i = blocks.length - 1; i >= 0; i--) {
                            if (!latestIt && blocks[i].includes('IT Support:')) latestIt = blocks[i];
                            if (!latestUser && blocks[i].includes('User Reply:')) latestUser = blocks[i];
                        }
                        
                        const displayBlocks = blocks.filter(b => b === latestIt || b === latestUser);

                        const boldedBlocks = displayBlocks.map(block => {
                            let lines = block.split('\n');
                            if (lines.length > 0 && (lines[0].includes('IT Support:') || lines[0].includes('User Reply:'))) {
                                lines[0] = `<strong>${lines[0]}</strong>`;
                            }
                            return lines.join('<br/>');
                        }).join('<br/><br/>');
                        bodyContent += `<p><strong>Comments:</strong><br/>${boldedBlocks}</p>`;
                    }

                    if (displayStatus !== 'Complete' && !isUserReply) {
                        const appUrl = request.headers.get('origin') || 'https://unified-manager.eqncs.com';
                        const replyUrl = `${appUrl}/reply?listId=${listId}&itemId=${itemId}`;
                        
                        bodyContent += `
<div style="text-align: center; margin: 30px 0;">
    <a href="${replyUrl}" style="background-color: #0d3c61; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">
        Click Here to Reply / Add a Comment
    </a>
</div>`;
                    }

                    const message = {
                        message: {
                            subject: isUserReply ? `User Reply on IT Request: ${ticketNum}` : `Update on your IT Request: ${ticketNum}`,
                            body: {
                                contentType: "HTML",
                                content: `
<title>Equinox Group IT Support Update</title>
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
<h2>IT Support Ticket Update</h2>
<p><strong>${isUserReply ? 'Good Day IT Support Team,' : 'Good Day,'}</strong></p>
${bodyContent}
<p><strong>Equinox Group IT Support Team</strong></p>
<div class="logo">
<img src="https://eqncs.com/2025/html/images/logo.png" alt="Company Logo" width="180">
</div>
<div class="notice">
<strong>Note:</strong> This is an automated message sent from an unattended mailbox. Please do not reply, as responses to this email address are not monitored.
</div>
<p class="footer">
This message is intended solely for the addressee and may contain confidential information. If you have received this message in error, please notify us immediately and permanently delete it. Do not use, copy, or disclose the information contained in this message or in any attachment.
</p>
</div>
`
                            },
                            toRecipients: [
                                { emailAddress: { address: targetEmail } }
                            ]
                        },
                        saveToSentItems: "false"
                    };

                    try {
                        await client.api('/users/noreply-automation@eqncs.com/sendMail').post(message);
                        console.log(`Successfully sent unified update email to ${targetEmail}`);
                    } catch(emailError) {
                        console.error("Failed to send IT Support unified email:", emailError);
                    }
                }
            }
        }

        return NextResponse.json({ success: true, item: response });
    } catch (error: any) {
        console.error('[API] Form Update Error:', error.message);
        return NextResponse.json({ error: "Failed to update form item", details: error.message }, { status: 500 });
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
        const cleanFields = stripReadOnlyFields(body.fields || {});

        const response = await client.api(`/sites/${SITE_ID}/lists/${listId}/items`)
            .post({ fields: cleanFields });

        return NextResponse.json({ success: true, item: response });
    } catch (error: any) {
        console.error('[API] Form Creation Error:', error.message);
        return NextResponse.json({ error: "Failed to create form item", details: error.message }, { status: 500 });
    }
}
