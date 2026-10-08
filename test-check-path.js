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
        console.log("Global Search for 'jnb21' inside Southern Region...");
        
        const searchPayload = {
            requests: [
                {
                    entityTypes: ["driveItem"],
                    query: {
                        queryString: 'jnb21 path:"https://xxeqncs.sharepoint.com/teams/SouthernRegion"'
                    },
                    region: "ZAF",
                    from: 0,
                    size: 1
                }
            ]
        };
        
        const searchRes = await client.api('/search/query').post(searchPayload);
        const hitsContainers = searchRes.value[0].hitsContainers || [];
        if (hitsContainers.length > 0 && hitsContainers[0].hits && hitsContainers[0].hits.length > 0) {
            const hit = hitsContainers[0].hits[0];
            const driveId = hit.resource.parentReference.driveId;
            const id = hit.resource.id;
            
            const driveItem = await client.api(`/drives/${driveId}/items/${id}`).get();
            console.log("parentReference.path:", driveItem.parentReference.path);
        } else {
            console.log("No hits found.");
        }
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
