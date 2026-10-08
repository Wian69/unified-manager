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

async function run() {
    const sourceUser = "jan.reyneke@eqncs.com";
    const targetUser = "jan.reyneke@partner.eqncs.com";
    try {
        const sourceFoldersReq = await client.api(`/users/${sourceUser}/mailFolders/msgfolderroot/childFolders?$top=250`).get();
        const targetFoldersReq = await client.api(`/users/${targetUser}/mailFolders/msgfolderroot/childFolders?$top=250`).get();
        
        const sourceNames = new Set(sourceFoldersReq.value.map(f => f.displayName));
        
        const defaultFolders = new Set(['Archive', 'Conversation History', 'Deleted Items', 'Drafts', 'Inbox', 'Junk Email', 'Outbox', 'Sent Items', 'Sync Issues']);
        
        console.log(`Folders in Target that also exist in Source (excluding default folders):`);
        for (const f of targetFoldersReq.value) {
            if (!defaultFolders.has(f.displayName) && sourceNames.has(f.displayName)) {
                console.log(`- ${f.displayName} (id: ${f.id})`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
