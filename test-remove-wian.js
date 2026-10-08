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
        const groupId = 'f4c16fc9-8f00-4500-bb87-536699cb66a0';
        const userIdToRemove = 'a008b308-fdd5-4df1-864b-f24fe35f68cd'; // Wian Du Randt
        
        console.log(`Removing ${userIdToRemove} from owners...`);
        await client.api(`/groups/${groupId}/owners/${userIdToRemove}/$ref`).delete();
        console.log("Removed.");
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
