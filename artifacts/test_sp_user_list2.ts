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

        // Get the first item to see fields
        console.log('Fetching top 1 item to inspect fields...');
        const top1 = await client.api(`/sites/${rootSiteId}/lists/${listId}/items`).expand('fields').top(1).get();
        console.log(JSON.stringify(top1.value[0]?.fields, null, 2));

        // Attempt to find a user (e.g. Jofrie or Wian)
        console.log('Searching for a specific user...');
        // Graph API filter might be limited on User Information List. Let's try fetching more and filtering client side for now just to see.
        const allUsers = await client.api(`/sites/${rootSiteId}/lists/${listId}/items`).expand('fields').top(999).get();
        
        const testUser = allUsers.value.find((i: any) => i.fields?.EMail === 'jofriel@eqncs.com' || i.fields?.EMail === 'wiand@eqncs.com');
        if (testUser) {
            console.log('Found test user:', testUser.id, testUser.fields?.Title, testUser.fields?.EMail);
        } else {
            console.log('Could not find test user in the top 999 items.');
        }

    } catch (e) {
        console.error(e);
    }
}

run();
