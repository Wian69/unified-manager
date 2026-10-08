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
        const user = 'arno.goedhart@eqncs.com';
        console.log('Fetching archive folders for', user);
        
        const res = await client.api(`/users/${user}/mailFolders/archiveMsgFolderRoot/childFolders`).version('beta').get();
        console.log('Archive Folders:', res.value.map((f: any) => f.displayName));
    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.body) console.error(e.body);
    }
}

run();
