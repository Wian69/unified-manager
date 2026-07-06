const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
require('dotenv').config({ path: '.env.local' });

async function run() {
    try {
        const tenantId = '5d57c9a9-b1b5-4cd2-be8c-14b00490163d'; // from the powershell output
        const clientId = '7fb4f9d0-0feb-4124-abab-f6acc712ac89'; // from the user
        const clientSecret = process.env.AZURE_CLIENT_SECRET;

        if (!clientSecret) {
            console.log("No client secret found. Please paste it.");
            return;
        }

        const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: ['https://graph.microsoft.com/.default'] });
        const client = Client.initWithMiddleware({ authProvider });

        console.log("Fetching users...");
        const users = await client.api('/users').top(1).get();
        const userId = users.value[0].id;
        
        console.log("Fetching chats...");
        const chats = await client.api(`/users/${userId}/chats`).top(1).get();
        const chatId = chats.value[0].id;

        console.log(`Fetching messages for ${chatId}...`);
        const messages = await client.api(`/users/${userId}/chats/${chatId}/messages`).get();
        console.log("Success! Messages:", messages.value.length);
    } catch (err) {
        console.log("ERROR CODE:", err.code);
        console.log("ERROR MESSAGE:", err.message);
        console.log("FULL ERROR:", JSON.stringify(err, null, 2));
    }
}

run();
