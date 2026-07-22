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
        const searchRes = await client.api('/search/query').post({
            requests: [{
                entityTypes: ['driveItem'],
                query: { queryString: '"Ziwani - Audit 2025" isDocument:false' },
                region: 'ZAF',
                from: 0,
                size: 25
            }]
        });
        const hits = searchRes.value?.[0]?.hitsContainers?.[0]?.hits || [];
        for (const hit of hits) {
            const item = hit.resource;
            console.log(`Found item: ${item.name} (${item.webUrl})`);
            if (item.name === 'Ziwani - Audit 2025') {
                const perms = await client.api(`/drives/${item.parentReference.driveId}/items/${item.id}/permissions`).get();
                console.log(JSON.stringify(perms.value, null, 2));
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();
