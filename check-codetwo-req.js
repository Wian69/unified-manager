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
        const apps = await client.api("/servicePrincipals?$filter=startswith(displayName, 'CodeTwo')").get();
        for (const app of apps.value) {
            console.log(`- App: ${app.displayName}`);
            console.log(`  AppRoleAssignmentRequired: ${app.appRoleAssignmentRequired}`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
