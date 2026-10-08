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
        console.log("Global Search for 'jnb21' (no path constraint)...");
        const searchPayload = {
            requests: [
                {
                    entityTypes: ["driveItem"],
                    query: {
                        queryString: 'jnb21'
                    },
                    region: "ZAF",
                    from: 0,
                    size: 10
                }
            ]
        };
        
        const searchRes = await client.api('/search/query').post(searchPayload);
        const hitsContainers = searchRes.value[0].hitsContainers || [];
        if (hitsContainers.length > 0 && hitsContainers[0].hits) {
            console.log(`Found ${hitsContainers[0].hits.length} items.`);
            for (const hit of hitsContainers[0].hits) {
                console.log(`- ${hit.resource.name} (webUrl: ${hit.resource.webUrl})`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
