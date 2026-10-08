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
        const targetDriveId = targetDriveItem.parentReference.driveId;
        const targetId = targetDriveItem.id;
        
        let childrenUrl = `/drives/${targetDriveId}/items/${targetId}/children?$top=100`;
        let hasNextChildren = true;
        let existingFiles = new Set();
        while (hasNextChildren) {
            const children = await client.api(childrenUrl).get();
            for (const item of children.value) {
                existingFiles.add(item.name.toLowerCase());
            }
            if (children['@odata.nextLink']) {
                childrenUrl = children['@odata.nextLink'];
            } else {
                hasNextChildren = false;
            }
        }

        console.log("Searching for jnb21 globally...");
        let from = 0;
        let moreResults = true;
        let copied = 0;
        let skipped = 0;
        
        while (moreResults) {
            const searchBody = {
                requests: [
                    {
                        entityTypes: ["driveItem"],
                        query: {
                            queryString: "jnb21"
                        },
                        region: "ZAF",
                        from: from,
                        size: 50
                    }
                ]
            };

            const response = await client.api('/search/query').post(searchBody);
            const hits = response.value[0]?.hitsContainers[0]?.hits || [];
            
            if (hits.length === 0) {
                moreResults = false;
                break;
            }

            console.log(`Fetched page starting at ${from}, found ${hits.length} items.`);

            for (const hit of hits) {
                const resource = hit.resource;
                if (!resource.name.toLowerCase().includes('jnb21')) {
                    // Skip if the actual name does not contain jnb21
                    continue;
                }

                if (existingFiles.has(resource.name.toLowerCase())) {
                    console.log(`Skipping (already in Vantage): ${resource.name}`);
                    skipped++;
                    continue;
                }

                console.log(`Copying: ${resource.name} from ${resource.webUrl}`);
                try {
                    const driveId = resource.parentReference?.driveId;
                    const itemId = resource.id;
                    if (!driveId || !itemId) continue;

                    const copyBody = {
                        parentReference: {
                            driveId: targetDriveId,
                            id: targetId
                        },
                        name: resource.name
                    };

                    await client.api(`/drives/${driveId}/items/${itemId}/copy`).post(copyBody);
                    console.log("-> Copied successfully");
                    existingFiles.add(resource.name.toLowerCase());
                    copied++;
                } catch (e) {
                    console.log(`-> Failed: ${e.message}`);
                }
            }

            if (response.value[0]?.hitsContainers[0]?.moreResultsAvailable) {
                from += 50;
            } else {
                moreResults = false;
            }
        }
        
        console.log(`Finished copying! Copied: ${copied}, Skipped: ${skipped}`);
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}
run();
