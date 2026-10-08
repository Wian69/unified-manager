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
        const targetUser = "jan.reyneke@partner.eqncs.com";
        const foldersReq = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        const afFolder = foldersReq.value.find(f => f.displayName === "Alexander Forbes");
        
        const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let url = `/users/${targetUser}/mailFolders/${afFolder.id}/messages?$filter=createdDateTime ge ${anHourAgo}&$top=100`;
        let deleted = 0;
        
        while(url) {
            const res = await client.api(url).get();
            for(const m of res.value) {
                await client.api(`/users/${targetUser}/messages/${m.id}`).delete();
                deleted++;
            }
            url = res['@odata.nextLink'];
        }
        
        console.log(`Deleted ${deleted} mistakenly added emails from Alexander Forbes.`);
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
