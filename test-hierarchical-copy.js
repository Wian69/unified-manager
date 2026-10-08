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
        const sourceDriveId = "b!jO2eBpPuLEy6wDT8U12aFmJ2X7OhBFhNgZW7I8SmbEsIfcVZo7sjS6W787lJaWBv";
        const targetUrl = "https://xxeqncs.sharepoint.com/teams/SharesForexternalusers/Shared%20Documents/Vantage";
        const encodedUrl = Buffer.from(targetUrl).toString('base64').replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
        const targetDriveItem = await client.api(`/shares/u!${encodedUrl}/driveItem`).get();
        const targetDriveId = targetDriveItem.parentReference.driveId;
        const targetRootId = targetDriveItem.id;
        
        console.log("Emptying Vantage folder...");
        const oldChildren = await client.api(`/drives/${targetDriveId}/items/${targetRootId}/children?$top=999`).get();
        for (const c of oldChildren.value) {
            await client.api(`/drives/${targetDriveId}/items/${c.id}`).delete();
        }
        console.log("Emptied.");

        // Cache for created folders: path -> id
        const folderCache = { "": targetRootId };

        async function ensureTargetFolder(pathArray) {
            let currentPath = "";
            let currentParentId = targetRootId;
            
            for (const folderName of pathArray) {
                const nextPath = currentPath ? `${currentPath}/${folderName}` : folderName;
                if (folderCache[nextPath]) {
                    currentParentId = folderCache[nextPath];
                    currentPath = nextPath;
                } else {
                    // Create folder
                    const newFolder = await client.api(`/drives/${targetDriveId}/items/${currentParentId}/children`).post({
                        name: folderName,
                        folder: { },
                        '@microsoft.graph.conflictBehavior': 'replace'
                    });
                    folderCache[nextPath] = newFolder.id;
                    currentParentId = newFolder.id;
                    currentPath = nextPath;
                }
            }
            return currentParentId;
        }

        async function traverseAndCopy(sourceId, pathArray) {
            let url = `/drives/${sourceDriveId}/items/${sourceId}/children?$top=999`;
            while (url) {
                const childrenReq = await client.api(url).get();
                for (const child of childrenReq.value) {
                    if (child.name.toLowerCase().includes('jnb21')) {
                        console.log(`Matching item found: ${[...pathArray, child.name].join('/')}`);
                        const targetParentId = await ensureTargetFolder(pathArray);
                        try {
                            await client.api(`/drives/${sourceDriveId}/items/${child.id}/copy`).post({
                                parentReference: {
                                    driveId: targetDriveId,
                                    id: targetParentId
                                },
                                name: child.name
                            });
                            console.log(` -> Copied`);
                        } catch (e) {
                            console.error(` -> Failed to copy: ${e.message}`);
                        }
                    } else if (child.folder) {
                        // Traverse deeper
                        await traverseAndCopy(child.id, [...pathArray, child.name]);
                    }
                }
                url = childrenReq['@odata.nextLink'];
            }
        }

        console.log("Starting hierarchical traversal...");
        await traverseAndCopy('root', []);
        console.log("Migration complete!");

    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
