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
        console.log("URGENT: Restoring EVERYTHING from Deleted Items back to Inbox...");
        
        const deletedItemsReq = await client.api(`/users/${targetUser}/mailFolders/deleteditems`).get();
        const deletedItemsId = deletedItemsReq.id;
        
        const inboxReq = await client.api(`/users/${targetUser}/mailFolders/inbox`).get();
        const inboxId = inboxReq.id;
        
        let skip = 0;
        let restoredCount = 0;
        let hasMore = true;
        
        while (hasMore) {
            const messagesReq = await client.api(`/users/${targetUser}/mailFolders/${deletedItemsId}/messages?$top=100&$skip=${skip}`).get();
            if (messagesReq.value.length === 0) {
                hasMore = false;
                break;
            }
            
            for (const msg of messagesReq.value) {
                try {
                    await client.api(`/users/${targetUser}/messages/${msg.id}/move`).post({
                        destinationId: inboxId
                    });
                    restoredCount++;
                    process.stdout.write(".");
                } catch (err) {
                    // Ignore errors if it fails to move one
                }
            }
            // We don't increment skip because moving an item removes it from the folder, 
            // so the next batch of 100 shifts down to index 0.
        }
        
        console.log(`\nSuccessfully restored ${restoredCount} emails back to the Inbox.`);
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
