import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';
import { getWatchlist, saveWatchlist } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const action = formData.get('action') as string;
        const userName = formData.get('userName') as string;
        const userId = formData.get('userId') as string;
        const userEmail = formData.get('userEmail') as string;

        if (!userName) {
            return NextResponse.json({ error: "Missing user name" }, { status: 400 });
        }

        const client = getGraphClient();
        
        // SharePoint Target IDs (EQNCS Homepage -> Policies -> Exit interview policies)
        const SITE_ID = 'xxeqncs.sharepoint.com,5dea61bb-5414-4eb9-8924-4db325049cf1,2e3e1f50-85e9-4e47-a44e-476d92257865';
        const DRIVE_ID = 'b!u2HqXRRUuU6JJE53zmMgmYbUu55OpG1HkiV4ZflxRZqZIVNCDxskQbXbEvQPTOVq';
        const BASE_FOLDER_ID = '01KVNKAHXZXJ5IB2PRBJHZLOIEXBU5A4O3';

        const sanitizedUserName = userName.replace(/[^a-z0-9\s.-]/gi, '_').trim();
        const userFolderRequestPath = `/drives/${DRIVE_ID}/items/${BASE_FOLDER_ID}:/${sanitizedUserName}`;

        if (action === 'create-folder') {
            try {
                try {
                    await client.api(userFolderRequestPath).get();
                    return NextResponse.json({ success: true, message: "SharePoint folder already exists", path: sanitizedUserName });
                } catch (e: any) {
                    if (e.code === 'itemNotFound') {
                        await client.api(`/drives/${DRIVE_ID}/items/${BASE_FOLDER_ID}/children`).post({ name: sanitizedUserName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" });
                        return NextResponse.json({ success: true, message: "SharePoint archival folder created", path: sanitizedUserName });
                    }
                    throw e;
                }
            } catch (err: any) {
                return NextResponse.json({ error: "Failed to prepare SharePoint folder", details: err.message }, { status: 500 });
            }
        }

        if (action === 'upload_and_automate') {
            const unifiedFile = formData.get('unifiedFile') as File | null;
            const personalEmail = formData.get('personalEmail') as string;
            const emailForward = formData.get('emailForward') as string;
            const removeLicense = formData.get('removeLicense') === 'true';

            if (!unifiedFile) {
                return NextResponse.json({ error: "Unified PDF file is required" }, { status: 400 });
            }

            // 1. RESOLVE FOLDER
            let userFolderId = "";
            try {
                try {
                    const folderMeta = await client.api(userFolderRequestPath).get();
                    userFolderId = folderMeta.id;
                } catch (e: any) {
                    if (e.code === 'itemNotFound') {
                        const newFolder = await client.api(`/drives/${DRIVE_ID}/items/${BASE_FOLDER_ID}/children`).post({ name: sanitizedUserName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" });
                        userFolderId = newFolder.id;
                    } else throw e;
                }
            } catch (folderErr: any) {
                return NextResponse.json({ error: "Failed to resolve SharePoint folder", details: folderErr.message }, { status: 500 });
            }

            const bytes = await unifiedFile.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const dateStr = new Date().toISOString().split('T')[0];
            const customName = `Equinox Group - Offboarding ${userName} ${dateStr}.pdf`;

            // 2. UPLOAD TO SHAREPOINT
            let webUrl = "";
            try {
                const uploadResult = await client.api(`/drives/${DRIVE_ID}/items/${userFolderId}:/${customName}:/content`).put(buffer);
                webUrl = uploadResult.webUrl;
            } catch (err: any) {
                return NextResponse.json({ error: "Failed to upload to SharePoint", details: err.message }, { status: 500 });
            }

            // 3. EXECUTE GRAPH API AUTOMATION
            const automationLogs: string[] = [];
            if (userId) {
                // A. Send Copy to Personal Email (Send via user's own mailbox before we disable it)
                if (personalEmail) {
                    try {
                        const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>EQN IT Support Acknowledgment</title>
<style>
body {
font-family: Arial, Helvetica, sans-serif;
background-color: #f4f6f8;
color: #333;
margin: 0;
padding: 40px;
}
.email-container {
max-width: 650px;
background-color: #ffffff;
border: 1px solid #d9e1ec;
border-radius: 8px;
padding: 30px 40px;
margin: 0 auto;
box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
h2 {
color: #0d3c61;
text-align: center;
margin-top: 0;
}
p {
line-height: 1.6;
margin: 8px 0;
}
strong {
color: #0d3c61;
}
.logo {
text-align: center;
margin-top: 30px;
}
.footer {
color: #888888;
font-size: smaller;
font-style: italic;
margin-top: 30px;
line-height: 1.4;
}
.notice {
background-color: #f0f4f8;
border-left: 4px solid #0d3c61;
padding: 10px 15px;
margin-top: 20px;
font-size: 13px;
color: #555;
}
</style>
</head>
<body>
<div class="email-container">
<h2>Offboarding Complete</h2>

<p><strong>Good Day,</strong></p>

<p>Please find attached copy of your offboarding.</p>

<p><strong>Equinox Group - IT Support</strong></p>

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
</div>
</body>
</html>`;

                        await client.api(`/users/noreply-automation@eqncs.com/sendMail`).post({
                            message: {
                                subject: "EQN IT Support Acknowledgment",
                                body: { contentType: "HTML", content: htmlBody },
                                toRecipients: [{ emailAddress: { address: personalEmail } }],
                                attachments: [{
                                    "@odata.type": "#microsoft.graph.fileAttachment",
                                    name: customName,
                                    contentType: "application/pdf",
                                    contentBytes: buffer.toString('base64')
                                }]
                            }
                        });
                        automationLogs.push("Sent PDF copy to " + personalEmail);
                    } catch (e: any) {
                        automationLogs.push("Failed to send personal email: " + e.message);
                    }
                }

                // B. Email Forwarding (Create Inbox Rule)
                if (emailForward) {
                    try {
                        await client.api(`/users/${userId}/mailFolders/inbox/messageRules`).post({
                            displayName: "Offboarding Forwarding",
                            sequence: 1,
                            isEnabled: true,
                            conditions: {}, 
                            actions: { 
                                forwardTo: [{ emailAddress: { address: emailForward } }], 
                                stopProcessingRules: true 
                            }
                        });
                        automationLogs.push("Email forwarding configured to " + emailForward);
                    } catch (e: any) {
                        automationLogs.push("Failed to set email forwarding: " + e.message);
                    }
                }

                // C. Disable Account & Revoke Sessions
                try {
                    await client.api(`/users/${userId}`).patch({ accountEnabled: false, officeLocation: "Excluded Group" });
                    automationLogs.push("User account disabled");
                    
                    try {
                        await client.api(`/users/${userId}/revokeSignInSessions`).post({});
                        automationLogs.push("Sessions revoked");
                    } catch (e) {
                        automationLogs.push("Session revocation skipped (might not be supported for this user)");
                    }
                } catch (e: any) {
                    automationLogs.push("Failed to disable account: " + e.message);
                }

                // D. Remove Licenses
                if (removeLicense) {
                    try {
                        const userMeta = await client.api(`/users/${userId}`).select('assignedLicenses').get();
                        const skusToRemove = userMeta.assignedLicenses?.map((l: any) => l.skuId) || [];
                        if (skusToRemove.length > 0) {
                            await client.api(`/users/${userId}/assignLicense`).post({
                                addLicenses: [],
                                removeLicenses: skusToRemove
                            });
                            automationLogs.push(`Removed ${skusToRemove.length} licenses`);
                        } else {
                            automationLogs.push("No licenses found to remove");
                        }
                    } catch (e: any) {
                        automationLogs.push("Failed to remove licenses: " + e.message);
                    }
                }
            }

            // 4. UPDATE WATCHLIST STATUS
            try {
                const watchlist = await getWatchlist();
                const updatedWatchlist = watchlist.map((u: any) => {
                    if (u.displayName === userName) {
                        return { ...u, status: "Offboarding Complete" };
                    }
                    return u;
                });
                await saveWatchlist(updatedWatchlist);
            } catch (dbErr) {
                console.error('DB status update failed:', dbErr);
            }

            return NextResponse.json({ 
                success: true, 
                message: "Archived to SharePoint and Automations Processed successfully",
                files: [customName],
                links: [webUrl],
                automationLogs
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error('Fatal Error:', error);
        return NextResponse.json({ error: "Archival System Error", details: error.message }, { status: 500 });
    }
}
