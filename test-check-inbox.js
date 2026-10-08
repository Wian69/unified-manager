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
        console.log("Checking Inbox...");
        const inboxReq = await client.api(`/users/${targetUser}/mailFolders/inbox/messages?$select=subject,isDraft&$top=10`).get();
        console.log(`Found ${inboxReq.value.length} messages in Inbox.`);
        for (const m of inboxReq.value) {
            console.log(`- ${m.subject} (Draft: ${m.isDraft})`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
