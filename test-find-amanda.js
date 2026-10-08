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
        const users = await client.api("/users?$filter=startswith(displayName,'Amanda') or startswith(mail,'amanda')").get();
        for (const u of users.value) {
            console.log(`Found User: ${u.displayName} (${u.mail || u.userPrincipalName})`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
