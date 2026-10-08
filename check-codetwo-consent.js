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
        console.log("Checking OAuth2PermissionGrants for CodeTwo...");
        const apps = await client.api("/servicePrincipals?$filter=startswith(displayName, 'CodeTwo')").get();
        
        for (const app of apps.value) {
            console.log(`\n- App: ${app.displayName}`);
            try {
                const grants = await client.api(`/oauth2PermissionGrants?$filter=clientId eq '${app.id}'`).get();
                if (grants.value.length === 0) {
                    console.log(`  [WARNING] No Admin Consent / OAuth2 Grants found!`);
                } else {
                    for (const g of grants.value) {
                        console.log(`  [OK] Granted: ${g.scope} (Consent Type: ${g.consentType})`);
                    }
                }
            } catch (e) {
                console.log(`  Error getting grants: ${e.message}`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
