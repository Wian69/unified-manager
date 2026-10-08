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
    const targetUser = "jan.reyneke@partner.eqncs.com";
    try {
        console.log(`Fetching root folders for ${targetUser}...`);
        const folders = await client.api(`/users/${targetUser}/mailFolders/msgfolderroot/childFolders?$top=250`).get();
        console.log(`Found ${folders.value.length} folders.`);
        for (const f of folders.value) {
            console.log(`- Folder: ${f.displayName} (Total items: ${f.totalItemCount}, Unread: ${f.unreadItemCount})`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
