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
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
});

const client = Client.initWithMiddleware({ authProvider });

async function run() {
    try {
        console.log("Searching for Ziwani folder...");
        const searchRes = await client.api('/search/query').post({
            requests: [{
                entityTypes: ['driveItem'],
                query: { queryString: 'Ziwani' },
                region: 'ZAF',
                from: 0,
                size: 25
            }]
        });

        const hits = searchRes.value?.[0]?.hitsContainers?.[0]?.hits || [];
        console.log(`Found ${hits.length} hits.`);
        for (const hit of hits) {
            console.log(hit.resource.name, hit.resource.id, hit.resource.webUrl);
        }

        // Try searching for Annique's explicit access
        console.log("\nSearching for Annique's SharedWithUsersOData...");
        const searchRes2 = await client.api('/search/query').post({
            requests: [{
                entityTypes: ['driveItem'],
                query: { queryString: 'SharedWithUsersOData:annique@eqncs.com' }, // Try to guess email
                region: 'ZAF',
                from: 0,
                size: 25
            }]
        });
        
        const hits2 = searchRes2.value?.[0]?.hitsContainers?.[0]?.hits || [];
        console.log(`Found ${hits2.length} hits for Annique.`);
        for (const hit of hits2) {
            console.log(hit.resource.name, hit.resource.id, hit.resource.webUrl);
        }

    } catch (e) {
        console.error(e);
    }
}

run();
