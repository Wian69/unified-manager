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
        console.log("Searching Deleted Items for legitimate non-draft emails...");
        
        // Get Deleted Items folder
        const deletedItemsReq = await client.api(`/users/${targetUser}/mailFolders/deleteditems`).get();
        const deletedItemsId = deletedItemsReq.id;
        
        // Get Inbox folder
        const inboxReq = await client.api(`/users/${targetUser}/mailFolders/inbox`).get();
        const inboxId = inboxReq.id;
        
        // Fetch non-draft messages from Deleted Items
        const messagesReq = await client.api(`/users/${targetUser}/mailFolders/${deletedItemsId}/messages?$filter=isDraft eq false&$top=100`).get();
        console.log(`Found ${messagesReq.value.length} legitimate non-draft emails in Deleted Items.`);
        
        let restoredCount = 0;
        for (const msg of messagesReq.value) {
            console.log(`- Restoring: ${msg.subject}`);
            await client.api(`/users/${targetUser}/messages/${msg.id}/move`).post({
                destinationId: inboxId
            });
            restoredCount++;
        }
        
        console.log(`Successfully restored ${restoredCount} emails back to the Inbox!`);
        
    } catch (e) {
        console.error("Error:", e.message);
        if (e.body) console.error(e.body);
    }
}
run();
