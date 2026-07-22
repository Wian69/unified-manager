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
        console.log('Fetching root site...');
        const rootSite = await client.api('/sites/xxeqncs.sharepoint.com:/').get();
        console.log('Root Site ID:', rootSite.id);

        console.log('Fetching lists for root site...');
        const lists = await client.api(`/sites/${rootSite.id}/lists`).get();
        const userList = lists.value.find((l: any) => l.displayName === 'User Information List');
        
        if (userList) {
            console.log('Found User Information List:', userList.id);
            // Let's get the first few items to see what it looks like
            const items = await client.api(`/sites/${rootSite.id}/lists/${userList.id}/items`).expand('fields').top(2).get();
            console.log('Items:', JSON.stringify(items.value, null, 2));
        } else {
            console.log('User Information List not found in standard lists. Trying by name...');
            try {
                // In Graph API, sometimes we can access hidden lists by name. 
                // Unfortunately, the name might be localized or hidden. 
                const listByName = await client.api(`/sites/${rootSite.id}/lists/User Information List`).get();
                console.log('List found by name:', listByName.id);
            } catch (e) {
                console.log('Could not find by name either.');
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();
