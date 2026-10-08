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

async function findVantageFolder() {
    const url = "https://xxeqncs.sharepoint.com/teams/SharesForexternalusers/Shared%20Documents/Vantage";
    const encodedUrl = Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
    const driveItem = await client.api(`/shares/u!${encodedUrl}/driveItem`).get();
    return {
        driveId: driveItem.parentReference.driveId,
        id: driveItem.id
    };
}

async function walkAndCopy(driveId, folderId, targetRef) {
    let url = `/drives/${driveId}/items/${folderId}/children?$top=100`;
    let hasNext = true;
    while (hasNext) {
        const children = await client.api(url).get();
        for (const item of children.value) {
            if (item.name.toLowerCase().includes('jnb')) {
                console.log(`Found match: ${item.name} (${item.folder ? 'Folder' : 'File'})`);
                // Copy item
                try {
                    await client.api(`/drives/${driveId}/items/${item.id}/copy`).post({
                        parentReference: targetRef,
                        name: item.name
                    });
                    console.log(`-> Copied ${item.name} to Vantage folder`);
                } catch (e) {
                    console.error(`-> Failed to copy ${item.name}: ${e.message}`);
                }
            } else if (item.folder) {
                await walkAndCopy(driveId, item.id, targetRef);
            }
        }
        if (children['@odata.nextLink']) {
            url = children['@odata.nextLink'];
        } else {
            hasNext = false;
        }
    }
}

async function run() {
    try {
        console.log("Resolving Vantage target folder...");
        const targetRef = await findVantageFolder();
        console.log("Target Ref:", targetRef);

        console.log("Finding Southern region site...");
        const siteSearch = await client.api('/sites?search=Southern').get();
        const southernSite = siteSearch.value.find(s => s.name.toLowerCase().includes('southern'));
        if (!southernSite) return;
        
        const drives = await client.api(`/sites/${southernSite.id}/drives`).get();
        const defaultDrive = drives.value[0];
        
        console.log(`Walking drive ${defaultDrive.name} for 'jnb'...`);
        await walkAndCopy(defaultDrive.id, 'root', targetRef);
        console.log("Done.");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
