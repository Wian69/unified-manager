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
        console.log("Cleaning up ONLY the buggy draft emails from the Inbox...");
        
        let deletedCount = 0;
        let hasMore = true;
        
        while (hasMore) {
            // Fetch only Drafts from the Inbox
            const messagesReq = await client.api(`/users/${targetUser}/mailFolders/inbox/messages?$filter=isDraft eq true&$select=id,subject&$top=100`).get();
            
            if (messagesReq.value.length === 0) {
                hasMore = false;
                break;
            }
            
            for (const msg of messagesReq.value) {
                try {
                    await client.api(`/users/${targetUser}/messages/${msg.id}`).delete();
                    deletedCount++;
                    process.stdout.write(".");
                } catch (err) {
                    console.error(`\nFailed to delete ${msg.subject}`);
                }
            }
        }
        
        console.log(`\nSuccessfully deleted ${deletedCount} broken Draft emails from the Inbox.`);
        console.log("Any remaining emails in the Inbox are legitimate, natively received emails.");
        
    } catch (e) {
        console.error("Error:", e.message);
        if (e.body) console.error(e.body);
    }
}
run();
