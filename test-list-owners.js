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
        const groupId = 'f4c16fc9-8f00-4500-bb87-536699cb66a0';
        console.log(`Group ID: ${groupId}`);
        
        console.log("\nFetching current Owners...");
        const ownersReq = await client.api(`/groups/${groupId}/owners`).get();
        for (const o of ownersReq.value) {
            console.log(`- Owner: ${o.displayName} (${o.userPrincipalName}) (ID: ${o.id})`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
