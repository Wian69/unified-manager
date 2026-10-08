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
        const domains = await client.api("/domains").get();
        for (const d of domains.value) {
            console.log(`Domain: ${d.id}`);
            console.log(`PasswordValidityPeriodInDays: ${d.passwordValidityPeriodInDays}`);
            console.log(`PasswordNotificationWindowInDays: ${d.passwordNotificationWindowInDays}`);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
