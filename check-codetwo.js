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
        console.log("Searching for CodeTwo Enterprise Applications / Service Principals...");
        const apps = await client.api("/servicePrincipals?$filter=startswith(displayName, 'CodeTwo')").get();
        console.log(`Found ${apps.value.length} CodeTwo service principals.`);
        
        for (const app of apps.value) {
            console.log(`\n- App: ${app.displayName} (ID: ${app.id}, AppId: ${app.appId})`);
            console.log(`  Account Enabled: ${app.accountEnabled}`);
            
            try {
                const assignments = await client.api(`/servicePrincipals/${app.id}/appRoleAssignedTo`).get();
                console.log(`  Assignments: ${assignments.value.length}`);
                for (const a of assignments.value) {
                    let principalName = "Unknown";
                    if (a.principalType === "Group") {
                        const grp = await client.api(`/groups/${a.principalId}`).get().catch(()=>({displayName: "Unknown Group"}));
                        principalName = grp.displayName || "Unknown Group";
                    } else if (a.principalType === "User") {
                        const usr = await client.api(`/users/${a.principalId}`).get().catch(()=>({displayName: "Unknown User"}));
                        principalName = usr.displayName || "Unknown User";
                    }
                    console.log(`    - [${a.principalType}] ${principalName} (ID: ${a.principalId})`);
                }
            } catch (e) {
                console.log(`  Error getting assignments: ${e.message}`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
