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
    const targetUser = "jan.reyneke@partner.eqncs.com";
    const foldersToDelete = [
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
    
    try {
        console.log("Fetching target root folders...");
        const targetFoldersReq = await client.api(`/users/${targetUser}/mailFolders/msgfolderroot/childFolders?$top=250`).get();
        
        for (const f of targetFoldersReq.value) {
            if (foldersToDelete.includes(f.displayName)) {
                console.log(`Deleting folder: ${f.displayName} (id: ${f.id})`);
                await client.api(`/users/${targetUser}/mailFolders/${f.id}`).delete();
                console.log(`-> Successfully deleted ${f.displayName}`);
            }
        }
        console.log("Undo complete.");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
