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
        console.log("Listing all sites containing 'southern'...");
        const siteSearch = await client.api('/sites?search=southern').get();
        for (const s of siteSearch.value) {
            console.log(`- ${s.name} | ${s.displayName} | ${s.webUrl}`);
        }
        
        console.log("Listing all sites containing 'jnb'...");
        const siteSearch2 = await client.api('/sites?search=jnb').get();
        for (const s of siteSearch2.value) {
            console.log(`- ${s.name} | ${s.displayName} | ${s.webUrl}`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
