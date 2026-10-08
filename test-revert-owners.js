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
        console.log(`Using hardcoded Group ID: ${groupId}`);
        
        const ownersReq = await client.api(`/groups/${groupId}/owners`).get();
        for (const o of ownersReq.value) {
            if (o.userPrincipalName && !o.userPrincipalName.includes('adm_wian')) {
                console.log(`Removing ${o.userPrincipalName} from owners...`);
                await client.api(`/groups/${groupId}/owners/${o.id}/$ref`).delete();
                console.log("Removed.");
            }
        }
        console.log("Revert complete. Only adm_wian should remain.");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
