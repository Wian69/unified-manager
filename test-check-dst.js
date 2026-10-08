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
        const targetUser = "jan.reyneke@partner.eqncs.com";
        const foldersReq = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        const sentItems = foldersReq.value.find(f => f.displayName === "Sent Items");
        console.log(`Sent Items ID: ${sentItems?.id}`);
        console.log(`Sent Items Total Count: ${sentItems?.totalItemCount}`);
        
        const afFolder = foldersReq.value.find(f => f.displayName === "Alexander Forbes");
        if (afFolder) {
            console.log(`Alexander Forbes Total Count: ${afFolder.totalItemCount}`);
            // Check if there are Sent Items in here
            const msgs = await client.api(`/users/${targetUser}/mailFolders/${afFolder.id}/messages?$top=5&$select=subject,sender`).get();
            console.log("Sample Alexander Forbes messages:");
            msgs.value.forEach(m => console.log(`- [${m.sender?.emailAddress?.address}] ${m.subject}`));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
