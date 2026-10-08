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
        console.log("Fetching Group...");
        const groupsReq = await client.api('/groups?$filter=mail eq \'Equinoxexco@eqncs.com\' or displayName eq \'Equinox Group - Exco\'').get();
        if (groupsReq.value.length === 0) {
            console.log("Group not found.");
            return;
        }
        const groupId = groupsReq.value[0].id;
        console.log(`Group ID: ${groupId}`);
        
        console.log("\nFetching current Owners...");
        const ownersReq = await client.api(`/groups/${groupId}/owners`).get();
        const ownerIds = ownersReq.value.map(o => o.id);
        for (const o of ownersReq.value) {
            console.log(`- Owner: ${o.displayName} (${o.userPrincipalName})`);
        }
        
        console.log("\nFetching current Members...");
        const membersReq = await client.api(`/groups/${groupId}/members`).get();
        for (const m of membersReq.value) {
            console.log(`- Member: ${m.displayName} (${m.userPrincipalName})`);
        }
        
        // Let's find Wian Du Randt and Jan Reyneke and make sure they are owners
        const usersReq = await client.api('/users?$filter=startswith(userPrincipalName, \'wian\') or startswith(userPrincipalName, \'jan\')').get();
        for (const u of usersReq.value) {
            if (!ownerIds.includes(u.id) && (u.userPrincipalName.includes('wian') || u.userPrincipalName.includes('jan'))) {
                console.log(`\nAdding ${u.userPrincipalName} as an Owner...`);
                await client.api(`/groups/${groupId}/owners/$ref`).post({
                    "@odata.id": `https://graph.microsoft.com/v1.0/users/${u.id}`
                });
                console.log("Added successfully!");
            }
        }
        
    } catch (e) {
        console.error("Error:", e.message);
        if (e.body) console.error(e.body);
    }
}
run();
