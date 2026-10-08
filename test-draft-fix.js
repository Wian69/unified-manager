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
        console.log("Testing message creation without draft flag...");
        
        const testFolder = await client.api(`/users/${targetUser}/mailFolders/msgfolderroot/childFolders`).post({
            displayName: "TestDraftFix"
        });
        
        const newMsg = {
            subject: "Test Non-Draft Message",
            body: { contentType: "text", content: "This is a test." },
            isRead: true,
            singleValueExtendedProperties: [
                {
                    id: "Integer 0x0E07",
                    value: "1" // 1 = MSGFLAG_READ, NOT UNSENT
                }
            ]
        };
        
        const createdMsg = await client.api(`/users/${targetUser}/mailFolders/${testFolder.id}/messages`).post(newMsg);
        
        console.log("Created message ID:", createdMsg.id);
        
        // Fetch it back to see if it's a draft
        const fetchedMsg = await client.api(`/users/${targetUser}/messages/${createdMsg.id}`).get();
        console.log("isDraft:", fetchedMsg.isDraft);
        
        // Clean up
        await client.api(`/users/${targetUser}/mailFolders/${testFolder.id}`).delete();
        console.log("Cleaned up test folder.");
        
    } catch (e) {
        console.error("Error:", e.message);
        if (e.body) console.error(e.body);
    }
}
run();
