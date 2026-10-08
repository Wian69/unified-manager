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
        const userEmail = 'jan.reyneke@eqncs.com';
        console.log(`Searching for user: ${userEmail}`);
        
        const user = await client.api(`/users/${userEmail}`)
            .select('displayName,userPrincipalName,createdDateTime')
            .get();

        console.log(`\nUser: ${user.displayName}`);
        console.log(`Email: ${user.userPrincipalName}`);
        console.log(`Account Created Date: ${user.createdDateTime}`);
        
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

run();
