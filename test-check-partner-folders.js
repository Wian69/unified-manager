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
        const folders = await client.api(`/users/${targetUser}/mailFolders`).get();
        console.log(`Folders in ${targetUser}:`);
        for (const folder of folders.value) {
            console.log(`- ${folder.displayName} (${folder.totalItemCount} items)`);
            if (folder.displayName === "Alexander Forbes") {
                const messages = await client.api(`/users/${targetUser}/mailFolders/${folder.id}/messages?$select=subject,isDraft,receivedDateTime&$top=5`).get();
                console.log(`  Sample messages in ${folder.displayName}:`);
                for (const msg of messages.value) {
                    console.log(`    - ${msg.subject} | isDraft: ${msg.isDraft} | received: ${msg.receivedDateTime}`);
                }
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
