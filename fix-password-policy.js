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
        console.log("Updating password policy to 90 days for all domains...");
        const domains = await client.api("/domains").get();
        for (const d of domains.value) {
            if (d.id.includes("partner.eqncs.com") || d.id.includes("codetwo")) continue; // Skip custom subdomains
            try {
                await client.api(`/domains/${d.id}`).patch({
                    passwordValidityPeriodInDays: 90,
                    passwordNotificationWindowInDays: 14
                });
                console.log(`Successfully updated ${d.id}`);
            } catch(e) {
                console.log(`Failed to update ${d.id}: ${e.message}`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
