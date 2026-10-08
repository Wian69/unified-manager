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
    try {
        const email = "amanda.law@eqncs.com";
        console.log(`Checking mailbox folders for ${email}...`);
        
        const folders = await client.api(`/users/${email}/mailFolders?$top=999`).get();
        folders.value.sort((a,b) => b.totalItemCount - a.totalItemCount);
        
        console.log("Top 10 Folders by Item Count:");
        for (let i=0; i<Math.min(10, folders.value.length); i++) {
            const f = folders.value[i];
            console.log(`- ${f.displayName}: ${f.totalItemCount} items`);
        }
        
        // Also check if Recoverable Items folder is accessible
        try {
            const ri = await client.api(`/users/${email}/mailFolders/RecoverableItemsDeletions`).get();
            console.log(`\nRecoverable Items Deletions: ${ri.totalItemCount} items`);
        } catch(e) {}
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
