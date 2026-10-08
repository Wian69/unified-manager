import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
});

const client = Client.initWithMiddleware({
    debugLogging: false,
    authProvider
});

async function copyFolderRecursively(client: any, sourceUser: string, targetUser: string, sourceFolderId: string, targetParentFolderId: string, recursive: boolean) {
    const sourceFolder = await client.api(`/users/${sourceUser}/mailFolders/${sourceFolderId}`).get();
    
    console.log(`[Migration] Creating folder '${sourceFolder.displayName}' in target...`);
    let targetFolder;
    try {
        targetFolder = await client.api(`/users/${targetUser}/mailFolders/${targetParentFolderId}/childFolders`).post({
            displayName: sourceFolder.displayName
        });
    } catch (e: any) {
        if (e.code === 'ErrorFolderExists') {
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

    console.log(`[Migration] Copying messages for '${sourceFolder.displayName}'...`);
    let hasNextMsg = true;
    let msgUrl = `/users/${sourceUser}/mailFolders/${sourceFolderId}/messages?$top=50`;
    
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

async function run() {
    try {
        const sourceUser = 'jan.reyneke@eqncs.com';
        const targetUser = 'jan.reyneke@partner.eqncs.com';
        
        console.log('Finding Sent Items folder in source...');
        const sentItemsFolders = await client.api(`/users/${sourceUser}/mailFolders/sentitems/childFolders`).get();
        
        const projectNileSent = sentItemsFolders.value.find((f: any) => f.displayName === 'Project Nile');
        if (projectNileSent) {
            console.log(`\n===========================================`);
            console.log(`Starting migration for: Sent Items/Project Nile`);
            // Copy to the target user's Sent Items folder instead of msgfolderroot
            await copyFolderRecursively(client, sourceUser, targetUser, projectNileSent.id, 'sentitems', true);
            console.log(`Completed migration for: Sent Items/Project Nile`);
        } else {
            console.log(`WARNING: Folder not found in source: Sent Items/Project Nile`);
        }
        
        console.log('\nSent Items folders copied successfully!');
    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.body) console.error(JSON.stringify(e.body, null, 2));
    }
}

run();
