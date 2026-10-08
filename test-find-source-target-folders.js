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
        
        const foundSourceFolders = {};
        
        async function fetchFolders(folderId = null, path = "") {
            let url = folderId 
                ? `/users/${sourceUser}/mailFolders/${folderId}/childFolders?$top=999`
                : `/users/${sourceUser}/mailFolders?$top=999`;
                
            const res = await client.api(url).get();
            for (const folder of res.value) {
                const currentPath = path ? `${path}/${folder.displayName}` : folder.displayName;
                if (targetFolders.includes(folder.displayName)) {
                    foundSourceFolders[folder.displayName] = { id: folder.id, path: currentPath };
                }
                if (folder.childFolderCount > 0) {
                    await fetchFolders(folder.id, currentPath);
                }
            }
        }
        
        console.log("Searching for target folders in source mailbox...");
        await fetchFolders();
        
        for (const name of targetFolders) {
            if (foundSourceFolders[name]) {
                console.log(`Found: ${name} at ${foundSourceFolders[name].path}`);
            } else {
                console.log(`MISSING: ${name}`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
