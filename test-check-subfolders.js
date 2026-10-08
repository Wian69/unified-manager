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
        const sourceUser = "jan.reyneke@eqncs.com";
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
        
        async function checkSubfolders(folderId = null) {
            let url = folderId 
                ? `/users/${sourceUser}/mailFolders/${folderId}/childFolders?$top=999`
                : `/users/${sourceUser}/mailFolders?$top=999`;
                
            const res = await client.api(url).get();
            for (const folder of res.value) {
                if (targetFolders.includes(folder.displayName)) {
                    console.log(`Folder: ${folder.displayName}, Child Folders: ${folder.childFolderCount}`);
                    if (folder.childFolderCount > 0) {
                        const subs = await client.api(`/users/${sourceUser}/mailFolders/${folder.id}/childFolders`).get();
                        for (const sub of subs.value) {
                            console.log(`  - Subfolder: ${sub.displayName} (${sub.totalItemCount} items)`);
                        }
                    }
                }
                if (folder.childFolderCount > 0) {
                    await checkSubfolders(folder.id);
                }
            }
        }
        await checkSubfolders();
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
