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
        console.log("Resolving Vantage target folder...");
        const url = "https://xxeqncs.sharepoint.com/teams/SharesForexternalusers/Shared%20Documents/Vantage";
        const encodedUrl = Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
        const targetDriveItem = await client.api(`/shares/u!${encodedUrl}/driveItem`).get();
        const targetRef = {
            driveId: targetDriveItem.parentReference.driveId,
            id: targetDriveItem.id
        };

        console.log("Global Search for 'jnb21' (ALL results)...");
        
        let from = 0;
        let moreResults = true;
        let totalCopied = 0;
        
        while (moreResults) {
            const searchPayload = {
                requests: [
                    {
                        entityTypes: ["driveItem"],
                        query: {
                            queryString: 'jnb21'
                        },
                        region: "ZAF",
                        from: from,
                        size: 50
                    }
                ]
            };
            
            const searchRes = await client.api('/search/query').post(searchPayload);
            const hitsContainers = searchRes.value[0].hitsContainers || [];
            
            if (hitsContainers.length === 0 || !hitsContainers[0].hits || hitsContainers[0].hits.length === 0) {
                moreResults = false;
                break;
            }
            
            const hits = hitsContainers[0].hits;
            console.log(`Fetched page starting at ${from}, found ${hits.length} items.`);
            
            for (const hit of hits) {
                const name = hit.resource.name;
                const driveId = hit.resource.parentReference?.driveId;
                const id = hit.resource.id;
                
                // Do not copy files that are ALREADY in the Vantage folder to avoid loops/errors
                if (hit.resource.webUrl.toLowerCase().includes('sharesforexternalusers') && 
                    hit.resource.webUrl.toLowerCase().includes('vantage')) {
                    console.log(`Skipping (already in Vantage): ${name}`);
                    continue;
                }
                
                if (!driveId) continue;
                
                console.log(`Copying: ${name} from ${hit.resource.webUrl}`);
                
                try {
                    await client.api(`/drives/${driveId}/items/${id}/copy`).post({
                        parentReference: targetRef,
                        name: name
                    });
                    console.log(`-> Copied successfully`);
                    totalCopied++;
                } catch(e) {
                    console.log(`-> Failed: ${e.message}`);
                }
            }
            
            if (hitsContainers[0].moreResultsAvailable) {
                from += 50;
            } else {
                moreResults = false;
            }
        }
        
        console.log(`Finished copying! Total copied: ${totalCopied}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
