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
        const targetUser = "jan.reyneke@partner.eqncs.com";
        const targetFolders = [
            "Alexander Forbes",
            "Bravura",
            "Micro Property Development Fund",
            "Project Nile",
            "SolarAfrica De Aar 2",
            "SolarAfrica De Aar 3",
            "SolarAfrica Energy",
            "SolarAfrica Sun Central Holdings",
            "Thane Capital"
        ];
        
        async function removeDuplicates(folderId, folderName) {
            console.log(`Checking for duplicates in ${folderName}...`);
            let url = `/users/${targetUser}/mailFolders/${folderId}/messages?$select=id,subject,receivedDateTime&$top=999`;
            
            const seen = new Set();
            let deletedCount = 0;
            
            while (url) {
                const msgsRes = await client.api(url).get();
                for (const msg of msgsRes.value) {
                    const key = `${msg.subject}_${msg.receivedDateTime}`;
                    if (seen.has(key)) {
                        // It's a duplicate! Delete it.
                        try {
                            await client.api(`/users/${targetUser}/messages/${msg.id}`).delete();
                            deletedCount++;
                        } catch (e) {
                            console.error(`Failed to delete duplicate ${msg.id}: ${e.message}`);
                        }
                    } else {
                        seen.add(key);
                    }
                }
                url = msgsRes['@odata.nextLink'];
            }
            if (deletedCount > 0) {
                console.log(`Deleted ${deletedCount} duplicates in ${folderName}!`);
            }
        }
        
        async function traverseAndClean(folderId, path) {
            await removeDuplicates(folderId, path);
            const childrenReq = await client.api(`/users/${targetUser}/mailFolders/${folderId}/childFolders?$top=999`).get();
            for (const child of childrenReq.value) {
                await traverseAndClean(child.id, `${path}/${child.displayName}`);
            }
        }
        
        console.log("Finding target folders...");
        const targetRes = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        for (const f of targetRes.value) {
            if (targetFolders.includes(f.displayName)) {
                await traverseAndClean(f.id, f.displayName);
            }
        }
        
        console.log("Duplicate cleanup complete!");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
