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
        
        console.log("Fetching current Members...");
        const membersReq = await client.api(`/groups/${groupId}/members`).get();
        const memberIds = membersReq.value.map(m => m.id);
        
        let admWianFound = false;
        for (const m of membersReq.value) {
            console.log(`- Member: ${m.displayName} (${m.userPrincipalName})`);
            if (m.userPrincipalName && m.userPrincipalName.includes('adm_wian')) {
                admWianFound = true;
            }
        }
        
        if (!admWianFound) {
            console.log("\nadm_wian is NOT a member! Searching for user ID...");
            const usersReq = await client.api('/users?$filter=startswith(userPrincipalName, \'adm_wian\')').get();
            if (usersReq.value.length > 0) {
                const userId = usersReq.value[0].id;
                console.log(`Adding ${usersReq.value[0].userPrincipalName} as a Member...`);
                await client.api(`/groups/${groupId}/members/$ref`).post({
                    "@odata.id": `https://graph.microsoft.com/v1.0/users/${userId}`
                });
                console.log("Added successfully!");
            }
        } else {
            console.log("adm_wian is already a member.");
        }
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
