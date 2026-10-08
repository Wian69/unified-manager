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
        const siteReq = await client.api('/sites/xxeqncs.sharepoint.com:/teams/SouthernRegion').get();
        console.log("Site ID:", siteReq.id);
        const drivesReq = await client.api(`/sites/${siteReq.id}/drives`).get();
        for (const d of drivesReq.value) {
            console.log(`Drive: ${d.name} (${d.id})`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
