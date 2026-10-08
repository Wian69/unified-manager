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
        console.log("Searching SharePoint for IT Request lists...");
        const sites = await client.api('/sites?search=').get();
        let found = false;
        
        for (const site of sites.value) {
            try {
                const lists = await client.api(`/sites/${site.id}/lists`).get();
                for (const l of lists.value) {
                    if (l.displayName.toLowerCase().includes("it") || l.displayName.toLowerCase().includes("request") || l.displayName.toLowerCase().includes("issue")) {
                        console.log(`\nFound List: "${l.displayName}"`);
                        console.log(`Site: ${site.displayName}`);
                        console.log(`URL: ${l.webUrl}`);
                        found = true;
                    }
                }
            } catch(e) {}
        }
        
        if (!found) console.log("No matching lists found. Could it be a Microsoft List in OneDrive?");

    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
