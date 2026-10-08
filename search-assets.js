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
        console.log("Searching SharePoint for documents containing 'asset'...");
        
        const searchBody = {
            requests: [
                {
                    entityTypes: ["driveItem"],
                    query: {
                        queryString: "asset"
                    },
                    region: "ZAF"
                }
            ]
        };

        const res = await client.api('/search/query').post(searchBody);
        
        const hits = res.value[0]?.hitsContainers[0]?.hits || [];
        if (hits.length === 0) {
            console.log("No matching documents found.");
        } else {
            console.log(`Found ${hits.length} matching documents:\n`);
            for (const hit of hits) {
                console.log(`- Document: ${hit.resource.name}`);
                console.log(`  URL: ${hit.resource.webUrl}`);
                console.log(`  Created By: ${hit.resource.createdBy?.user?.displayName || 'Unknown'}`);
                console.log(`  Last Modified: ${hit.resource.lastModifiedDateTime}`);
                console.log("");
            }
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
