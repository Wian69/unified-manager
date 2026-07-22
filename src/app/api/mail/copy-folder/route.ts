import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function POST(request: Request) {
    const body = await request.json();
    const { sourceUser, targetUser, sourceFolderIds, recursive } = body;

    if (!sourceUser || !targetUser || !sourceFolderIds || !Array.isArray(sourceFolderIds) || sourceFolderIds.length === 0) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            function sendLog(message: string) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'log', message })}\n\n`));
            }

            function sendComplete() {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`));
                controller.close();
            }

            function sendError(error: string) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error })}\n\n`));
                controller.close();
            }

            try {
                await executeBackgroundMigration(sourceUser, targetUser, sourceFolderIds, !!recursive, sendLog);
                sendComplete();
            } catch (error: any) {
                sendError(error.message);
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

async function executeBackgroundMigration(sourceUser: string, targetUser: string, sourceFolderIds: string[], recursive: boolean, sendLog: (msg: string) => void) {
    const client = getGraphClient();
    sendLog(`Starting migration from ${sourceUser} to ${targetUser}`);

    for (const folderId of sourceFolderIds) {
        try {
            await copyFolderRecursively(client, sourceUser, targetUser, folderId, 'msgfolderroot', recursive, sendLog);
        } catch (err: any) {
            sendLog(`[Error] Failed to process folder: ${err.message}`);
        }
    }
    sendLog(`Migration finished!`);
}

async function copyFolderRecursively(client: any, sourceUser: string, targetUser: string, sourceFolderId: string, targetParentFolderId: string, recursive: boolean, sendLog: (msg: string) => void) {
    const sourceFolder = await client.api(`/users/${sourceUser}/mailFolders/${sourceFolderId}`).get();
    
    sendLog(`Creating folder: ${sourceFolder.displayName}`);
    let targetFolder;
    try {
        targetFolder = await client.api(`/users/${targetUser}/mailFolders/${targetParentFolderId}/childFolders`).post({
            displayName: sourceFolder.displayName
        });
    } catch (e: any) {
        if (e.code === 'ErrorFolderExists') {
            const existingFolders = await client.api(`/users/${targetUser}/mailFolders/${targetParentFolderId}/childFolders?$top=250`).get();
            const found = existingFolders.value.find((f: any) => f.displayName.toLowerCase() === sourceFolder.displayName.toLowerCase());
            if (found) {
                targetFolder = found;
            } else {
                throw new Error(`Folder exists but couldn't be retrieved: ${sourceFolder.displayName}`);
            }
        } else {
            throw e;
        }
    }

    sendLog(`Copying messages for: ${sourceFolder.displayName}`);
    let hasNextMsg = true;
    let msgUrl = `/users/${sourceUser}/mailFolders/${sourceFolderId}/messages?$top=50`;
    
    let totalCopied = 0;
    while (hasNextMsg && msgUrl) {
        const msgs = await client.api(msgUrl).header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly').get();
        
        for (const msg of msgs.value) {
            try {
                const fullMsg = await client.api(`/users/${sourceUser}/messages/${msg.id}`).get();
                
                const newMsg = {
                    subject: fullMsg.subject,
                    body: fullMsg.body,
                    toRecipients: fullMsg.toRecipients,
                    ccRecipients: fullMsg.ccRecipients,
                    bccRecipients: fullMsg.bccRecipients,
                    from: fullMsg.from,
                    sender: fullMsg.sender,
                    isRead: fullMsg.isRead,
                    importance: fullMsg.importance,
                    singleValueExtendedProperties: [
                        {
                            id: "SystemTime 0x0E06",
                            value: fullMsg.receivedDateTime
                        }
                    ]
                };

                await client.api(`/users/${targetUser}/mailFolders/${targetFolder.id}/messages`).post(newMsg);
                totalCopied++;
                if (totalCopied % 10 === 0) {
                    sendLog(`... copied ${totalCopied} messages in ${sourceFolder.displayName}`);
                }
            } catch (err: any) {
                console.error(`Failed to copy message ${msg.subject}: ${err.message}`);
            }
        }
        
        if (msgs['@odata.nextLink']) {
            msgUrl = msgs['@odata.nextLink'];
        } else {
            hasNextMsg = false;
        }
    }
    if (totalCopied > 0) sendLog(`Finished copying ${totalCopied} messages in ${sourceFolder.displayName}`);

    if (recursive && sourceFolder.childFolderCount > 0) {
        let hasNextSub = true;
        let subUrl = `/users/${sourceUser}/mailFolders/${sourceFolderId}/childFolders?$top=50`;
        
        while (hasNextSub && subUrl) {
            const subFolders = await client.api(subUrl).get();
            for (const sub of subFolders.value) {
                await copyFolderRecursively(client, sourceUser, targetUser, sub.id, targetFolder.id, recursive, sendLog);
            }
            if (subFolders['@odata.nextLink']) {
                subUrl = subFolders['@odata.nextLink'];
            } else {
                hasNextSub = false;
            }
        }
    }
}
