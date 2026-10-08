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
        const targetNames = [
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
        
        console.log("Looking for 'Sent Items' folder...");
        const res = await client.api(`/users/${sourceUser}/mailFolders?$top=999`).get();
        let sentItemsId = null;
        for (const f of res.value) {
            if (f.displayName === "Sent Items") {
                sentItemsId = f.id;
                break;
            }
        }
        
        if (!sentItemsId) {
            console.log("Could not find Sent Items folder!");
            return;
        }
        console.log(`Found Sent Items (ID: ${sentItemsId})`);
        
        // Check for subfolders with these names
        console.log("\n--- Checking for SUBFOLDERS inside Sent Items ---");
        async function searchSubfolders(folderId = null, path = "") {
            let url = `/users/${sourceUser}/mailFolders/${folderId}/childFolders?$top=999`;
            const sRes = await client.api(url).get();
            for (const folder of sRes.value) {
                const currentPath = path ? `${path}/${folder.displayName}` : folder.displayName;
                if (targetNames.includes(folder.displayName)) {
                    console.log(`Found MATCHING Subfolder: Sent Items/${currentPath} (Items: ${folder.totalItemCount})`);
                } else {
                    // Check if name partially matches
                    for (const t of targetNames) {
                        if (folder.displayName.toLowerCase().includes(t.toLowerCase())) {
                            console.log(`Found PARTIAL MATCH Subfolder: Sent Items/${currentPath} (Items: ${folder.totalItemCount})`);
                        }
                    }
                }
                
                if (folder.childFolderCount > 0) {
                    await searchSubfolders(folder.id, currentPath);
                }
            }
        }
        await searchSubfolders(sentItemsId);
        
        // Search emails by keyword in the root of Sent Items
        console.log("\n--- Searching ROOT of Sent Items for loose emails containing keywords ---");
        for (const name of targetNames) {
            // using graph search for keyword in subject/body
            const searchUrl = `/users/${sourceUser}/mailFolders/${sentItemsId}/messages?$search="${name}"&$select=subject,sentDateTime&$top=10`;
            const searchRes = await client.api(searchUrl).header('ConsistencyLevel', 'eventual').get();
            console.log(`Keyword "${name}": Found ${searchRes.value.length} loose emails (showing top hits).`);
            // if (searchRes.value.length > 0) {
            //     for (const msg of searchRes.value) {
            //         console.log(`  - [${msg.sentDateTime}] ${msg.subject}`);
            //     }
            // }
        }
        
        console.log("\nFinished Search!");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
