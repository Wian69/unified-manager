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
        const sourceUser = 'arno.goedhart@eqncs.com';
        const targetUser = 'bert.damstra@eqncs.com';

        // 1. Get a message from source
        console.log(`Fetching 1 message from ${sourceUser}...`);
        const msgs = await client.api(`/users/${sourceUser}/mailFolders/inbox/messages`).top(1).get();
        if (!msgs.value || msgs.value.length === 0) {
            console.log('No messages found');
            return;
        }
        const msgId = msgs.value[0].id;
        const msgSubject = msgs.value[0].subject;
        console.log(`Message to copy: ${msgSubject}`);

        // 2. Fetch MIME
        console.log('Fetching MIME...');
        // To get MIME:
        let mimeString = '';
        try {
            const mimeRes = await fetch(`https://graph.microsoft.com/v1.0/users/${sourceUser}/messages/${msgId}/$value`, {
                headers: {
                    Authorization: `Bearer ${(await credential.getToken('https://graph.microsoft.com/.default')).token}`
                }
            });
            mimeString = await mimeRes.text();
            console.log('Got MIME, length:', mimeString.length);
        } catch(e) {
            console.error('Failed to get MIME', e);
            return;
        }

        // 3. Try to POST to target using MIME
        // Unfortunately, creating messages via MIME directly using /messages is not fully supported in standard REST without drafts, but let's see.
        // Actually, we can use the outlook task or just reconstruct the message.
        // A better approach for migration is getting the JSON, and posting it.
        console.log('Attempting to create message via JSON reconstruction...');
        const fullMsg = await client.api(`/users/${sourceUser}/messages/${msgId}`).get();
        
        // Strip read-only properties
        const newMsg = {
            subject: fullMsg.subject,
            body: fullMsg.body,
            toRecipients: fullMsg.toRecipients,
            ccRecipients: fullMsg.ccRecipients,
            from: fullMsg.from,
            sender: fullMsg.sender,
            isRead: fullMsg.isRead,
            importance: fullMsg.importance,
            // SingleValueExtendedProperties to keep original dates
            singleValueExtendedProperties: [
                {
                    id: "SystemTime 0x0E06", // PR_MESSAGE_DELIVERY_TIME
                    value: fullMsg.receivedDateTime
                }
            ]
        };

        const createdMsg = await client.api(`/users/${targetUser}/messages`).post(newMsg);
        console.log('Created message in target:', createdMsg.id);

    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.body) console.error(e.body);
    }
}

run();
