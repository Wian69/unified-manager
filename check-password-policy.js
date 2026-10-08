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
        console.log("Checking User Password Policies...");
        const users = await client.api("/users?$select=displayName,userPrincipalName,passwordPolicies").get();
        let neverExpiresCount = 0;
        let expiresCount = 0;
        
        for (const u of users.value) {
            if (u.passwordPolicies && u.passwordPolicies.includes("DisablePasswordExpiration")) {
                neverExpiresCount++;
            } else {
                expiresCount++;
            }
        }
        console.log(`Users with DisablePasswordExpiration: ${neverExpiresCount}`);
        console.log(`Users whose passwords will expire (following tenant policy): ${expiresCount}`);
        
        // Let's try to query authorization policy just in case
        try {
            const authPolicy = await client.api('/policies/authorizationPolicy').get();
            console.log("\nAuthorization Policy:");
            console.log(JSON.stringify(authPolicy, null, 2));
        } catch(e) {
            console.log("Could not read auth policy.");
        }
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
