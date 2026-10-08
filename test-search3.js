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
        const siteSearch = await client.api('/sites?search=Southern').get();
        const southernSite = siteSearch.value.find(s => s.name.toLowerCase().includes('southern'));
        if (!southernSite) return;
        
        const drives = await client.api(`/sites/${southernSite.id}/drives`).get();
        const defaultDrive = drives.value[0];
        
        console.log("Listing children of Southern region drive:");
        let hasNext = true;
        let url = `/drives/${defaultDrive.id}/root/children?$top=100`;
        while (hasNext) {
            const children = await client.api(url).get();
            for (const item of children.value) {
                if (item.name.toLowerCase().includes('jnb21')) {
                    console.log(`- FOUND MATCH: ${item.name} (${item.webUrl})`);
                } else if (item.folder) {
                    // search one level deep
                    const subchildren = await client.api(`/drives/${defaultDrive.id}/items/${item.id}/children`).get();
                    for (const sub of subchildren.value) {
                        if (sub.name.toLowerCase().includes('jnb21')) {
                            console.log(`- FOUND MATCH: ${sub.name} in ${item.name}`);
                            console.log(`  ID: ${sub.id}`);
                        }
                    }
                }
            }
            if (children['@odata.nextLink']) {
                url = children['@odata.nextLink'];
            } else {
                hasNext = false;
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
