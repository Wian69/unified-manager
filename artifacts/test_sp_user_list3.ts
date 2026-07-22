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
        
        console.log('Searching for Wian by EMail filter...');
        const res = await client.api(`/sites/${rootSiteId}/lists/${listId}/items`)
            .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
            .filter(`fields/EMail eq 'wiand@eqncs.com'`)
            .expand('fields')
            .get();
        
        console.log('Results:', JSON.stringify(res.value, null, 2));

        if (res.value.length > 0) {
            console.log('Attempting to delete user item...');
            await client.api(`/sites/${rootSiteId}/lists/${listId}/items/${res.value[0].id}`).delete();
            console.log('Deleted successfully!');
        }

    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.body) console.error(e.body);
    }
}

run();
