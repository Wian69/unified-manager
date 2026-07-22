import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sourceUser, targetUser, sourceFolderIds, recursive } = body;

        if (!sourceUser || !targetUser || !sourceFolderIds || !Array.isArray(sourceFolderIds) || sourceFolderIds.length === 0) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // We run the copy process in the background so the request doesn't timeout
        executeBackgroundMigration(sourceUser, targetUser, sourceFolderIds, !!recursive).catch(console.error);

        return NextResponse.json({ success: true, message: "Migration started in background" });
    } catch (error: any) {
        console.error('[API] Migration Start Error:', error);
        return NextResponse.json({ error: "Failed to start migration" }, { status: 500 });
    }
}

async function executeBackgroundMigration(sourceUser: string, targetUser: string, sourceFolderIds: string[], recursive: boolean) {
    const client = getGraphClient();
    console.log(`[Migration] Starting from ${sourceUser} to ${targetUser}, Folders: ${sourceFolderIds.length}, Recursive: ${recursive}`);

    try {
        for (const folderId of sourceFolderIds) {
            await copyFolderRecursively(client, sourceUser, targetUser, folderId, 'msgfolderroot', recursive);
        }
        console.log(`[Migration] Completed for ${sourceUser} -> ${targetUser}`);
    } catch (e: any) {
        console.error(`[Migration] Fatal Error:`, e.message);
    }
}

async function copyFolderRecursively(client: any, sourceUser: string, targetUser: string, sourceFolderId: string, targetParentFolderId: string, recursive: boolean) {
    // 1. Get source folder details
    const sourceFolder = await client.api(`/users/${sourceUser}/mailFolders/${sourceFolderId}`).get();
    
    // 2. Create folder in target user
    console.log(`[Migration] Creating folder '${sourceFolder.displayName}' in target...`);
    let targetFolder;
    try {
        targetFolder = await client.api(`/users/${targetUser}/mailFolders/${targetParentFolderId}/childFolders`).post({
            displayName: sourceFolder.displayName
        });
    } catch (e: any) {
        if (e.code === 'ErrorFolderExists') {
            // If folder exists, we might need to find it by name
            const existingFolders = await client.api(`/users/${targetUser}/mailFolders/${targetParentFolderId}/childFolders`).filter(`displayName eq '${sourceFolder.displayName}'`).get();
            if (existingFolders.value.length > 0) {
                targetFolder = existingFolders.value[0];
            } else {
                throw new Error(`Folder exists but couldn't be retrieved: ${sourceFolder.displayName}`);
            }
        } else {
            throw e;
        }
    }

    // 3. Copy messages in this folder
    console.log(`[Migration] Copying messages for '${sourceFolder.displayName}'...`);
    let hasNextMsg = true;
    let msgUrl = `/users/${sourceUser}/mailFolders/${sourceFolderId}/messages?$top=50`;
    
    while (hasNextMsg && msgUrl) {
        const msgs = await client.api(msgUrl).header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly').get();
        
        for (const msg of msgs.value) {
            try {
                // Fetch full message to get body and all properties correctly
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
                            id: "SystemTime 0x0E06", // PR_MESSAGE_DELIVERY_TIME
                            value: fullMsg.receivedDateTime
                        }
                    ]
                };

                await client.api(`/users/${targetUser}/mailFolders/${targetFolder.id}/messages`).post(newMsg);
            } catch (err: any) {
                console.error(`[Migration] Failed to copy message ${msg.subject}: ${err.message}`);
            }
        }
        
        if (msgs['@odata.nextLink']) {
            msgUrl = msgs['@odata.nextLink'];
        } else {
            hasNextMsg = false;
        }
    }

    // 4. Handle Subfolders recursively
    if (recursive && sourceFolder.childFolderCount > 0) {
        console.log(`[Migration] Processing subfolders for '${sourceFolder.displayName}'...`);
        let hasNextSub = true;
        let subUrl = `/users/${sourceUser}/mailFolders/${sourceFolderId}/childFolders?$top=50`;
        
        while (hasNextSub && subUrl) {
            const subFolders = await client.api(subUrl).get();
            for (const sub of subFolders.value) {
                await copyFolderRecursively(client, sourceUser, targetUser, sub.id, targetFolder.id, recursive);
            }
            if (subFolders['@odata.nextLink']) {
                subUrl = subFolders['@odata.nextLink'];
            } else {
                hasNextSub = false;
            }
        }
    }
}
