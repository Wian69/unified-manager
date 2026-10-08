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
        
        console.log("Fetching existing folders to delete...");
        const res = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        for (const f of res.value) {
            if (targetFolders.includes(f.displayName)) {
                console.log(`Deleting ${f.displayName}...`);
                await client.api(`/users/${targetUser}/mailFolders/${f.id}`).delete();
            }
        }
        
        console.log("Re-creating fresh folders...");
        for (const name of targetFolders) {
            console.log(`Creating ${name}...`);
            await client.api(`/users/${targetUser}/mailFolders`).post({
                displayName: name,
                isHidden: false
            });
        }
        
        console.log("Deletion and creation complete.");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
