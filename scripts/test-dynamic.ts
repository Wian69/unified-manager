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
        const g1 = await client.api('/groups/2a3fbc2e-be8d-44f1-a453-ac269e055920').get();
        console.log(g1.displayName, g1.groupTypes, g1.membershipRule);
        
        const g2 = await client.api('/groups/361b1fce-12c3-42fe-95bd-791e2fe7b533').get();
        console.log(g2.displayName, g2.groupTypes, g2.membershipRule);
    } catch (e) {
        console.error(e.message);
    }
}

run();
