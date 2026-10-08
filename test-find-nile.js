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
        
        async function searchNile(folderId = null, path = "") {
            let url = folderId 
                ? `/users/${sourceUser}/mailFolders/${folderId}/childFolders?$top=999`
                : `/users/${sourceUser}/mailFolders?$top=999`;
                
            const res = await client.api(url).get();
            for (const folder of res.value) {
                const currentPath = path ? `${path}/${folder.displayName}` : folder.displayName;
                if (folder.displayName === "Project Nile") {
                    console.log(`Found: ${currentPath} (Items: ${folder.totalItemCount}, Child Folders: ${folder.childFolderCount})`);
                }
                if (folder.childFolderCount > 0) {
                    await searchNile(folder.id, currentPath);
                }
            }
        }
        await searchNile();
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
