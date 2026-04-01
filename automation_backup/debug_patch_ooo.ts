import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import fs from 'fs';

// Manual env loading
if (fs.existsSync('.env.local')) {
    const env = fs.readFileSync('.env.local', 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            process.env[key] = value;
        }
    });
}

async function debugPatchOOO() {
    const tenantId = process.env.AZURE_TENANT_ID!;
    const userId = "adm_wian@eqncs.com"; // A known user from previous logs

    const credential = new ClientSecretCredential(tenantId, process.env.AZURE_CLIENT_ID!, process.env.AZURE_CLIENT_SECRET!);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default'],
    });

    const client = Client.initWithMiddleware({ authProvider });

    const testBody = {
        automaticRepliesSetting: {
            status: "alwaysEnabled",
            internalReplyMessage: "Testing Unified Manager OOO Sync...",
            externalReplyMessage: "Testing Unified Manager OOO Sync..."
        }
    };

    try {
        console.log(`Attempting to PATCH mailboxSettings for ${userId}...`);
        const result = await client.api(`/users/${userId}/mailboxSettings`).update(testBody);
        console.log('SUCCESS:', JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.log('FAILURE:', error.message);
        if (error.body) {
            console.log('Error Details:', JSON.stringify(JSON.parse(error.body), null, 2));
        }
    }
}

debugPatchOOO();
