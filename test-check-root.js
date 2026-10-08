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
        const sourceDriveId = "b!jO2eBpPuLEy6wDT8U12aFmJ2X7OhBFhNgZW7I8SmbEsIfcVZo7sjS6W787lJaWBv";
        const childrenReq = await client.api(`/drives/${sourceDriveId}/items/root/children`).get();
        console.log(`Root has ${childrenReq.value.length} children.`);
        for (const child of childrenReq.value) {
            console.log(`- ${child.name} (folder: ${!!child.folder})`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
