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
        console.log("Searching for Southern region site...");
        const siteSearch = await client.api('/sites?search=Southern').get();
        const southernSite = siteSearch.value.find(s => s.name.toLowerCase().includes('southern'));
        if (!southernSite) {
            console.log("Could not find Southern site. Found:", siteSearch.value.map(s => s.name));
            return;
        }
        console.log("Found Southern Site:", southernSite.name);
        
        const drives = await client.api(`/sites/${southernSite.id}/drives`).get();
        console.log("Drives found:", drives.value.map(d => d.name));
        
        const defaultDrive = drives.value[0];
        
        console.log("Searching for 'jnb21' in drive", defaultDrive.id);
        const searchRes = await client.api(`/drives/${defaultDrive.id}/search(q='jnb21')`).get();
        console.log(`Found ${searchRes.value.length} items`);
        for (const item of searchRes.value) {
            console.log(`- ${item.name} (${item.webUrl})`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
