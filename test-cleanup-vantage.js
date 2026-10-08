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

        console.log("Cleaning up Vantage folder to ensure ONLY files with 'jnb21' in their name are kept...");
        let deletedFiles = 0;

        async function traverseAndDeleteFiles(folderId) {
            let url = `/drives/${targetDriveId}/items/${folderId}/children?$top=999`;
            while (url) {
                const childrenReq = await client.api(url).get();
                for (const child of childrenReq.value) {
                    if (child.folder) {
                        // Recurse into folders
                        await traverseAndDeleteFiles(child.id);
                    } else if (child.file) {
                        // Check if file name contains JNB21
                        if (!child.name.toLowerCase().includes('jnb21')) {
                            console.log(`Deleting non-matching file: ${child.name}`);
                            try {
                                await client.api(`/drives/${targetDriveId}/items/${child.id}`).delete();
                                deletedFiles++;
                            } catch (e) {
                                console.log(`Failed to delete ${child.name}`);
                            }
                        }
                    }
                }
                url = childrenReq['@odata.nextLink'];
            }
        }

        await traverseAndDeleteFiles(targetRootId);
        console.log(`Cleanup complete. Deleted ${deletedFiles} files that did not have 'jnb21' in their filename.`);

    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
