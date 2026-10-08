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
        console.log("Searching for Equinox Group - Exco site...");
        // Get the group
        const groupsReq = await client.api('/groups?$filter=mail eq \'Equinoxexco@eqncs.com\' or displayName eq \'Equinox Group - Exco\'').get();
        if (groupsReq.value.length === 0) {
            console.log("Group not found.");
            return;
        }
        const groupId = groupsReq.value[0].id;
        console.log(`Group ID: ${groupId}`);
        
        // Get the drive (Shared Documents)
        const driveReq = await client.api(`/groups/${groupId}/drive`).get();
        console.log(`Drive ID: ${driveReq.id}`);
        
        // List folders in root
        const childrenReq = await client.api(`/groups/${groupId}/drive/root/children`).get();
        console.log("Folders in root of Shared Documents:");
        let generalFolder = null;
        for (const child of childrenReq.value) {
            console.log(`- ${child.name} (type: ${child.folder ? 'folder' : 'file'})`);
            if (child.name === 'General') {
                generalFolder = child;
            }
        }
        
        if (!generalFolder) {
            console.log("\n'General' folder is missing! Attempting to create it...");
            const newFolder = await client.api(`/groups/${groupId}/drive/root/children`).post({
                name: 'General',
                folder: { },
                '@microsoft.graph.conflictBehavior': 'rename'
            });
            console.log("Created 'General' folder successfully.");
            generalFolder = newFolder;
        }
        
        // Check for Recordings folder inside General
        const generalChildren = await client.api(`/groups/${groupId}/drive/items/${generalFolder.id}/children`).get();
        console.log(`\nFolders inside General:`);
        let recordingsFolder = null;
        for (const child of generalChildren.value) {
            console.log(`- ${child.name}`);
            if (child.name === 'Recordings') {
                recordingsFolder = child;
            }
        }
        
        if (!recordingsFolder) {
            console.log("\n'Recordings' folder is missing! Attempting to create it...");
            await client.api(`/groups/${groupId}/drive/items/${generalFolder.id}/children`).post({
                name: 'Recordings',
                folder: { },
                '@microsoft.graph.conflictBehavior': 'rename'
            });
            console.log("Created 'Recordings' folder successfully.");
        }
        
    } catch (e) {
        console.error("Error:", e.message);
        if (e.body) console.error(e.body);
    }
}
run();
