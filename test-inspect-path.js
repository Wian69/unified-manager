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
        const searchPayload = {
            requests: [
                {
                    entityTypes: ["driveItem"],
                    query: {
                        queryString: 'jnb21 path:"https://xxeqncs.sharepoint.com/Shared Documents/Southern region"'
                    },
                    region: "ZAF",
                    from: 0,
                    size: 1
                }
            ]
        };
        
        const searchRes = await client.api('/search/query').post(searchPayload);
        const hit = searchRes.value[0].hitsContainers[0].hits[0];
        
        const driveItem = await client.api(`/drives/${hit.resource.parentReference.driveId}/items/${hit.resource.id}`).get();
        console.log("parentReference:", JSON.stringify(driveItem.parentReference, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
