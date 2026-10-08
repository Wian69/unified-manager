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
        console.log("Searching for site SharesForexternalusers...");
        const siteSearch = await client.api('/sites?search=SharesForexternalusers').get();
        console.log("Site search result:", JSON.stringify(siteSearch, null, 2));

        if (siteSearch.value && siteSearch.value.length > 0) {
            const siteId = siteSearch.value[0].id;
            console.log("Found site ID:", siteId);
            
            console.log("Fetching drives for site...");
            const drives = await client.api(`/sites/${siteId}/drives`).get();
            console.log("Drives:", JSON.stringify(drives, null, 2));
            
            if (drives.value && drives.value.length > 0) {
                const driveId = drives.value[0].id;
                console.log("Fetching children for default drive:", driveId);
                const children = await client.api(`/drives/${driveId}/root/children`).get();
                console.log("Children count:", children.value.length);
                for (let c of children.value) {
                    console.log(`- ${c.name} (folder: ${!!c.folder})`);
                }
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
