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
        console.log('Checking Sent Items subfolders...');
        const folders = await client.api(`/users/${sourceUser}/mailFolders/sentitems/childFolders`).get();
        console.log(`Found ${folders.value.length} subfolders in Sent Items:`);
        folders.value.forEach((f: any) => console.log(`- ${f.displayName} (Items: ${f.totalItemCount})`));
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

run();
