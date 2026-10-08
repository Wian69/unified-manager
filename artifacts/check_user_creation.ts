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
        console.log(`Searching for users with 'Danie' in their name...`);
        
        const users = await client.api('/users')
            .filter("startswith(displayName, 'Danie')")
            .select('displayName,userPrincipalName,createdDateTime')
            .get();

        if (users.value.length > 0) {
            users.value.forEach((u: any) => {
                console.log(`\nUser: ${u.displayName}`);
                console.log(`Email: ${u.userPrincipalName}`);
                console.log(`Account Created Date: ${u.createdDateTime}`);
            });
        } else {
            console.log('No user found starting with Danie.');
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

run();
