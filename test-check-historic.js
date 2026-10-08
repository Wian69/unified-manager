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
        const msgs = await client.api(`/users/${targetUser}/messages?$filter=subject eq 'Test Historic Date'`).get();
        if (msgs.value.length > 0) {
            console.log("Found message! receivedDateTime:", msgs.value[0].receivedDateTime);
        } else {
            console.log("Message not found.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
