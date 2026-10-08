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
        
        const url = "https://xxeqncs.sharepoint.com/teams/SharesForexternalusers/Shared%20Documents/Vantage";
        const encodedUrl = Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
        const targetDriveItem = await client.api(`/shares/u!${encodedUrl}/driveItem`).get();
        const targetRef = {
            driveId: targetDriveItem.parentReference.driveId,
            id: targetDriveItem.id
        };

        for (const container of hitsContainers) {
            const hits = container.hits || [];
            for (const hit of hits) {
                if (hit.resource.webUrl.toLowerCase().includes('southern region')) {
                    console.log(`Copying: ${hit.resource.name}`);
                    console.log(`URL: ${hit.resource.webUrl}`);
                    const driveId = hit.resource.parentReference.driveId;
                    const id = hit.resource.id;
                    
                    try {
                        const copyReq = await client.api(`/drives/${driveId}/items/${id}/copy`).post({
                            parentReference: targetRef,
                            name: hit.resource.name
                        });
                        console.log(`-> Copied successfully`);
                    } catch(e) {
                        console.log(`-> Failed: ${e.message}`);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
