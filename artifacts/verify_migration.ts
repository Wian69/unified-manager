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

async function getFolders(user: string, folderId: string = 'msgfolderroot', prefix: string = '') {
    let allFolders: any[] = [];
    try {
        let url = `/users/${user}/mailFolders/${folderId}/childFolders?$top=250`;
        let hasNext = true;
        while (hasNext && url) {
            const res = await client.api(url).get();
            for (const folder of res.value) {
                folder.path = prefix ? `${prefix}/${folder.displayName}` : folder.displayName;
                allFolders.push(folder);
                
                // Fetch subfolders if any
                if (folder.childFolderCount > 0) {
                    const subFolders = await getFolders(user, folder.id, folder.path);
                    allFolders = allFolders.concat(subFolders);
                }
            }
            url = res['@odata.nextLink'];
            if (!url) hasNext = false;
        }
    } catch (e: any) {
        console.error(`Error fetching folders for ${user}:`, e.message);
    }
    return allFolders;
}

async function run() {
    try {
        const targetUser = 'jan.reyneke@partner.eqncs.com';
        console.log(`Checking folders for target user: ${targetUser}`);
        
        const folders = await getFolders(targetUser);
        
        console.log(`\nFound ${folders.length} top-level/sub folders in ${targetUser}:`);
        
        folders.sort((a, b) => a.path.localeCompare(b.path));
        
        for (const folder of folders) {
            console.log(`- ${folder.path} (Items: ${folder.totalItemCount}, Unread: ${folder.unreadItemCount})`);
        }
        
    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.body) console.error(JSON.stringify(e.body, null, 2));
    }
}

run();
