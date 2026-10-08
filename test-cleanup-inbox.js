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
    const targetFolders = ['inbox', 'archive', 'sentitems'];
    
    try {
        console.log("Cleaning up default folders...");
        for (const folder of targetFolders) {
            console.log(`Fetching messages from ${folder}...`);
            let messagesReq = await client.api(`/users/${targetUser}/mailFolders/${folder}/messages?$select=id&$top=1000`).get();
            let count = 0;
            
            for (const msg of messagesReq.value) {
                await client.api(`/users/${targetUser}/messages/${msg.id}`).delete();
                count++;
            }
            console.log(`Deleted ${count} messages from ${folder}`);
        }
        console.log("Cleanup complete!");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
