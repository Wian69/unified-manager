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
        const groups = await client.api('/groups')
            .filter("startswith(displayName, 'Equinox Group - Exco')")
            .select('id,displayName,mail')
            .get();
        
        if (groups.value.length > 0) {
            const group = groups.value[0];
            console.log(`Found group: ${group.displayName} (${group.mail})`);
            
            try {
                const site = await client.api(`/groups/${group.id}/sites/root`).get();
                console.log(`SharePoint Site URL: ${site.webUrl}`);
            } catch(e) {
                console.log("Could not fetch site:", e.message);
            }
            
            try {
                const team = await client.api(`/teams/${group.id}`).get();
                console.log(`Teams is provisioned for this group: ${team.webUrl}`);
            } catch(e) {
                console.log("Could not fetch team (it might not be a team yet, or it's provisioning):", e.message);
                console.log("Attempting to provision Team for the group...");
                // Create a team from the group if it doesn't exist
                try {
                    await client.api(`/groups/${group.id}/team`).put({
                        "memberSettings": {
                            "allowCreateUpdateChannels": true
                        },
                        "messagingSettings": {
                            "allowUserEditMessages": true,
                            "allowUserDeleteMessages": true
                        },
                        "funSettings": {
                            "allowGiphy": true,
                            "giphyContentRating": "strict"
                        }
                    });
                    console.log("Team successfully provisioned for the group.");
                } catch(err) {
                    console.log("Failed to provision team:", err.message);
                }
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
