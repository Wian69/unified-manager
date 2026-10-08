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
        const email = "amanda@eqncs.com";
        console.log(`Checking mailbox usage for ${email}...`);
        
        // Let's first verify user exists
        const user = await client.api(`/users/${email}`).get();
        console.log(`User found: ${user.displayName}`);

        // We can't directly get mailbox stats via Graph without Reports API,
        // but we can check the total items in folders to see if anything is absurdly huge.
        const folders = await client.api(`/users/${email}/mailFolders?$top=999`).get();
        let totalItems = 0;
        for (const f of folders.value) {
            console.log(`- ${f.displayName}: ${f.totalItemCount} items`);
            totalItems += f.totalItemCount;
        }
        console.log(`Total items across top folders: ${totalItems}`);

    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
