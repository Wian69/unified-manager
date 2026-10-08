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
        console.log("Global Search for 'jnb' with region ZAF...");
        const searchPayload = {
            requests: [
                {
                    entityTypes: ["driveItem"],
                    query: {
                        queryString: "jnb21"
                    },
                    region: "ZAF"
                }
            ]
        };
        const searchRes = await client.api('/search/query').post(searchPayload);
        const hitsContainers = searchRes.value[0].hitsContainers || [];
        for (const container of hitsContainers) {
            const hits = container.hits || [];
            console.log(`Found ${hits.length} items:`);
            for (const hit of hits) {
                console.log(`- ${hit.resource.name}`);
                console.log(`  URL: ${hit.resource.webUrl}`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
