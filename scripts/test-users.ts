import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const tenantId = process.env.AZURE_TENANT_ID!;
const clientId = process.env.AZURE_CLIENT_ID!;
const clientSecret = process.env.AZURE_CLIENT_SECRET!;

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: ['https://graph.microsoft.com/.default'] });
const client = Client.initWithMiddleware({ authProvider });

async function run() {
    try {
        console.log("Checking all users named Annique");
        const users = await client.api('/users').filter("startsWith(displayName, 'Annique')").get();
        console.log(users.value?.map((u: any) => ({ name: u.displayName, mail: u.mail, upn: u.userPrincipalName, id: u.id })));
    } catch (e) {
        console.error(e.message);
    }
}

run();
