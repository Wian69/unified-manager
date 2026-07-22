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
    const names = ["Jofrie", "Pierre", "Tanya", "Ruhann", "Juha", "Amorette", "Carla"];
    
    for (const name of names) {
        try {
            const res = await client.api('/users').filter(`startsWith(displayName, '${name}')`).get();
            if (res.value && res.value.length > 0) {
                for (const u of res.value) {
                    console.log(`Found: ${u.displayName} (${u.mail || u.userPrincipalName}) - ID: ${u.id}`);
                }
            } else {
                console.log(`No user found for: ${name}`);
            }
        } catch (e) {
            console.error(`Error searching for ${name}:`, e.message);
        }
    }
}

run();
