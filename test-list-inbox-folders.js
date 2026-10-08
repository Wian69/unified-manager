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
        const sourceUser = "jan.reyneke@eqncs.com";
        const inbox = (await client.api(`/users/${sourceUser}/mailFolders`).get()).value.find(f => f.displayName === "Inbox");
        
        const foldersReq = await client.api(`/users/${sourceUser}/mailFolders/${inbox.id}/childFolders?$top=999`).get();
        console.log(`Subfolders of Inbox in ${sourceUser}:`);
        for (const f of foldersReq.value) {
            console.log(`- ${f.displayName} (${f.totalItemCount} items)`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
