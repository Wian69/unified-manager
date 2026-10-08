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
    try {
        const inboxReq = await client.api(`/users/${sourceUser}/mailFolders/inbox/messages?$top=1`).get();
        // Graph API doesn't easily give total count without count=true and advanced query, but we can check the folder object itself
        const folderReq = await client.api(`/users/${sourceUser}/mailFolders/inbox`).get();
        console.log(`Source Inbox total items: ${folderReq.totalItemCount}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
