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
        console.log("Searching for Equinoxexco@eqncs.com...");
        const groupsReq = await client.api('/groups?$filter=mail eq \'Equinoxexco@eqncs.com\' or displayName eq \'Equinox Group - Exco\'').get();
        if (groupsReq.value.length === 0) {
            console.log("Group not found by filter.");
        } else {
            console.log("Found:", groupsReq.value[0].id);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
