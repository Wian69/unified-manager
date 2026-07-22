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
        const rootSiteId = 'xxeqncs.sharepoint.com,5dea61bb-5414-4eb9-8924-4e77ce632099,9ebbd486-a44e-476d-9225-7865f971459a';
        const listId = '480dd628-b51c-46a9-9aba-f8d3c83b1635';
        
        console.log('Fetching items...');
        let hasNext = true;
        let url = `/sites/${rootSiteId}/lists/${listId}/items?$expand=fields&$top=999`;
        const users: any[] = [];
        
        while (hasNext && url) {
            const res = await client.api(url).header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly').get();
            users.push(...res.value);
            if (res['@odata.nextLink']) {
                url = res['@odata.nextLink'];
            } else {
                hasNext = false;
            }
        }
        
        console.log(`Fetched ${users.length} total items.`);
        
        // Let's print the first 5 people (ContentType = Person)
        const people = users.filter(u => u.fields?.ContentType === 'Person');
        console.log(`Found ${people.length} people.`);
        
        console.log(JSON.stringify(people.slice(0, 5).map(u => ({
            id: u.id,
            Title: u.fields?.Title,
            EMail: u.fields?.EMail,
            UserName: u.fields?.UserName,
            Name: u.fields?.Name
        })), null, 2));

        // See if we have Jofrie or Wian
        const found = people.find(u => (u.fields?.EMail || '').toLowerCase().includes('eqncs'));
        console.log('Sample user from EQNCS:', found ? { id: found.id, title: found.fields.Title, email: found.fields.EMail, name: found.fields.Name } : 'None');

    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.body) console.error(e.body);
    }
}

run();
