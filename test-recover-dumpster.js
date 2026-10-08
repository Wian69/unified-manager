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
        console.log("Searching Recoverable Items (Dumpster) for the lost native emails...");
        
        const inboxReq = await client.api(`/users/${targetUser}/mailFolders/inbox`).get();
        const inboxId = inboxReq.id;
        
        // Fetch messages from RecoverableItemsDeletions
        const messagesReq = await client.api(`/users/${targetUser}/mailFolders/recoverableitemsdeletions/messages?$top=500`).get();
        console.log(`Found ${messagesReq.value.length} items in Recoverable Items.`);
        
        let restoredCount = 0;
        for (const msg of messagesReq.value) {
            // Restore everything we find back to the Inbox
            try {
                await client.api(`/users/${targetUser}/messages/${msg.id}/move`).post({
                    destinationId: inboxId
                });
                restoredCount++;
                process.stdout.write(".");
            } catch (err) {
                // Ignore move errors
            }
        }
        
        console.log(`\nSuccessfully rescued ${restoredCount} emails from the dumpster and placed them in the Inbox!`);
        
    } catch (e) {
        console.error("Error:", e.message);
        if (e.body) console.error(e.body);
    }
}
run();
