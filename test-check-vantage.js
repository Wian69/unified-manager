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
        console.log("Checking Vantage folder...");
        const url = "https://xxeqncs.sharepoint.com/teams/SharesForexternalusers/Shared%20Documents/Vantage";
        const encodedUrl = Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
        
        const targetDriveItem = await client.api(`/shares/u!${encodedUrl}/driveItem`).get();
        const targetDriveId = targetDriveItem.parentReference.driveId;
        const targetId = targetDriveItem.id;
        
        const children = await client.api(`/drives/${targetDriveId}/items/${targetId}/children?$top=10`).get();
        console.log(`Vantage has ${children.value.length} children in this page.`);
        for (const c of children.value) {
            console.log(`- ${c.name}`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
