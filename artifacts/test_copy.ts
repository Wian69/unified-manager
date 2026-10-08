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

async function run() {
    try {
        const sourceUser = 'jan.reyneke@eqncs.com';
        const targetUser = 'jan.reyneke@partner.eqncs.com';
        
        console.log('Finding a small folder in source...');
        const folders = await client.api(`/users/${sourceUser}/mailFolders/inbox/childFolders`).filter(`displayName eq 'Aa Clients'`).get();
        if (folders.value.length === 0) return console.log('Aa Clients not found');
        
        const subfolders = await client.api(`/users/${sourceUser}/mailFolders/${folders.value[0].id}/childFolders`).filter(`displayName eq 'Agile Legal'`).get();
        if (subfolders.value.length === 0) return console.log('Agile Legal not found');
        
        const sourceFolder = subfolders.value[0];
        console.log(`Testing copy for folder: ${sourceFolder.displayName}`);

        // 2. Create folder in target user
        console.log(`[Migration] Creating folder '${sourceFolder.displayName}' in target...`);
        let targetFolder;
        try {
            targetFolder = await client.api(`/users/${targetUser}/mailFolders/msgfolderroot/childFolders`).post({
                displayName: sourceFolder.displayName
            });
        } catch (e: any) {
            if (e.code === 'ErrorFolderExists') {
                const existingFolders = await client.api(`/users/${targetUser}/mailFolders/msgfolderroot/childFolders`).filter(`displayName eq '${sourceFolder.displayName}'`).get();
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
        const msgs = await client.api(`/users/${sourceUser}/mailFolders/${sourceFolder.id}/messages?$top=5`).header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly').get();
        
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
                            id: "SystemTime 0x0E06", // PR_MESSAGE_DELIVERY_TIME
                            value: fullMsg.receivedDateTime
                        }
                    ]
                };

                await client.api(`/users/${targetUser}/mailFolders/${targetFolder.id}/messages`).post(newMsg);
                console.log(`Success copying message: ${msg.subject}`);
            } catch (err: any) {
                console.error(`[Migration] Failed to copy message ${msg.subject}: ${err.message}`);
                console.error(err.body || err);
            }
        }

    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.body) console.error(JSON.stringify(e.body, null, 2));
    }
}

run();
