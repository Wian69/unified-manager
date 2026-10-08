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
        const targetUrl = "https://xxeqncs.sharepoint.com/teams/SharesForexternalusers/Shared%20Documents/Vantage";
        const encodedUrl = Buffer.from(targetUrl).toString('base64').replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
        const targetDriveItem = await client.api(`/shares/u!${encodedUrl}/driveItem`).get();
        const targetDriveId = targetDriveItem.parentReference.driveId;
        const targetRootId = targetDriveItem.id;

        console.log("Emptying Vantage folder to remove flat artifacts...");
        const oldChildren = await client.api(`/drives/${targetDriveId}/items/${targetRootId}/children?$top=999`).get();
        for (const c of oldChildren.value) {
            await client.api(`/drives/${targetDriveId}/items/${c.id}`).delete();
        }
        console.log("Emptied.");

        const folderCache = { "": targetRootId };

        async function ensureTargetFolder(pathArray) {
            let currentPath = "";
            let currentParentId = targetRootId;
            
            for (const folderName of pathArray) {
                if (!folderName) continue;
                const nextPath = currentPath ? `${currentPath}/${folderName}` : folderName;
                if (folderCache[nextPath]) {
                    currentParentId = folderCache[nextPath];
                    currentPath = nextPath;
                } else {
                    try {
                        const newFolder = await client.api(`/drives/${targetDriveId}/items/${currentParentId}/children`).post({
                            name: folderName,
                            folder: { },
                            '@microsoft.graph.conflictBehavior': 'rename'
                        });
                        folderCache[nextPath] = newFolder.id;
                        currentParentId = newFolder.id;
                        currentPath = nextPath;
                    } catch (e) {
                        const existingReq = await client.api(`/drives/${targetDriveId}/items/${currentParentId}/children?$filter=name eq '${folderName.replace(/'/g, "''")}'`).get();
                        if (existingReq.value.length > 0) {
                            folderCache[nextPath] = existingReq.value[0].id;
                            currentParentId = existingReq.value[0].id;
                            currentPath = nextPath;
                        } else {
                            throw e;
                        }
                    }
                }
            }
            return currentParentId;
        }

        console.log("Global Search for 'jnb21' inside Southern Region...");
        let from = 0;
        let moreResults = true;
        let totalCopied = 0;
        
        while (moreResults) {
            const searchPayload = {
                requests: [
                    {
                        entityTypes: ["driveItem"],
                        query: {
                            queryString: 'jnb21 path:"https://xxeqncs.sharepoint.com/Shared Documents/Southern region"'
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
                const driveId = hit.resource.parentReference.driveId;
                const id = hit.resource.id;
                
                let driveItem;
                try {
                    driveItem = await client.api(`/drives/${driveId}/items/${id}`).get();
                } catch(e) {
                    continue;
                }
                
                let relativePath = "";
                if (driveItem.parentReference && driveItem.parentReference.path) {
                    const rawPath = driveItem.parentReference.path;
                    const match = rawPath.match(/\/root:(.*)$/);
                    if (match && match[1]) {
                        relativePath = match[1];
                    }
                }
                
                const pathArray = relativePath.split('/').filter(p => p.trim() !== '' && p !== 'General' && p.toLowerCase() !== 'southern region');
                
                const targetParentId = await ensureTargetFolder(pathArray);
                
                try {
                    await client.api(`/drives/${driveId}/items/${id}/copy`).post({
                        parentReference: {
                            driveId: targetDriveId,
                            id: targetParentId
                        },
                        name: name
                    });
                    console.log(`-> Copied [${pathArray.join('/')}] ${name}`);
                    totalCopied++;
                } catch(e) {
                    // Ignore already exists
                }
            }
            
            if (hitsContainers[0].moreResultsAvailable) {
                from += 50;
            } else {
                moreResults = false;
            }
        }
        
        console.log(`Finished structured copying! Total copied: ${totalCopied}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
