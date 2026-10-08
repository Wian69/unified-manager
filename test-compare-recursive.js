const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const { ClientSecretCredential } = require("@azure/identity");
require("dotenv").config({ path: ".env.local" });

const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
});
const client = Client.initWithMiddleware({ authProvider });

async function searchFolders(user, parentId = 'msgfolderroot', path = '') {
    const res = await client.api(`/users/${user}/mailFolders/${parentId}/childFolders?$top=250`).get();
    let folders = [];
    for (const f of res.value) {
        const fullPath = path ? `${path}/${f.displayName}` : f.displayName;
        folders.push({ name: f.displayName, id: f.id, fullPath });
        if (f.childFolderCount > 0) {
            const children = await searchFolders(user, f.id, fullPath);
            folders = folders.concat(children);
        }
    }
    return folders;
}

async function run() {
    const sourceUser = "jan.reyneke@eqncs.com";
    const targetUser = "jan.reyneke@partner.eqncs.com";
    try {
        console.log("Fetching target root folders...");
        const targetFoldersReq = await client.api(`/users/${targetUser}/mailFolders/msgfolderroot/childFolders?$top=250`).get();
        const targetRootNames = targetFoldersReq.value.map(f => f.displayName);
        
        console.log("Fetching source ALL folders...");
        const sourceFolders = await searchFolders(sourceUser);
        const sourceNames = new Set(sourceFolders.map(f => f.name));
        
        const defaultFolders = new Set(['Archive', 'Conversation History', 'Deleted Items', 'Drafts', 'Inbox', 'Junk Email', 'Outbox', 'Sent Items', 'Sync Issues']);
        
        console.log(`\nMatching folders:`);
        for (const f of targetFoldersReq.value) {
            if (!defaultFolders.has(f.displayName) && sourceNames.has(f.displayName)) {
                console.log(`- ${f.displayName}`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
