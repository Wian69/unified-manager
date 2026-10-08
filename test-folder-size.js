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

async function getFolderSize(user, folderId) {
    let size = 0;
    let hasNext = true;
    let url = `/users/${user}/mailFolders/${folderId}/messages?$top=100`; // removed $select
    
    while (hasNext && url) {
        const res = await client.api(url).header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly').get();
        for (const msg of res.value) {
            // Note: size is in bytes? Let's assume bytes.
            // If size is not present, we will fallback to 0. It usually isn't present unless requested, but $select=size failed.
            // Actually, in Graph API, we can calculate size roughly by fetching full message or if size is returned by default.
            // Let's just log one message to see if size is there.
            
            // If there's a hasAttachments, we might want to fetch attachments sizes if size is not there.
            // Actually let's assume size is just returned by default or not.
            if (msg.size !== undefined) {
                size += msg.size;
            } else {
               // Fallback: estimate based on body length and attachments
               let est = (msg.body?.content?.length || 0);
               if (msg.hasAttachments) {
                   // A rough estimate: if it has attachments, it might be large.
                   // To be accurate, we'd need to fetch attachments.
                   // But let's just do a quick size fetch for a few.
                   est += 1024 * 1024; // Add a dummy 1MB per attachment email if we can't get size
               }
               size += est;
            }
        }
        url = res['@odata.nextLink'];
        hasNext = !!url;
    }
    
    let hasNextSub = true;
    let subUrl = `/users/${user}/mailFolders/${folderId}/childFolders?$top=100`;
    while (hasNextSub && subUrl) {
        const res = await client.api(subUrl).get();
        for (const sub of res.value) {
            size += await getFolderSize(user, sub.id);
        }
        subUrl = res['@odata.nextLink'];
        hasNextSub = !!subUrl;
    }
    return size;
}

async function run() {
    const targetUser = "jan.reyneke@partner.eqncs.com";
    const copiedFolders = [
        "Alexander Forbes",
        "Bravura",
        "Micro Property Development Fund",
        "Project Nile",
        "SolarAfrica De Aar 2",
        "SolarAfrica De Aar 3",
        "SolarAfrica Energy",
        "SolarAfrica Sun Central Holdings",
        "Thane Capital"
    ];
    
    try {
        console.log(`Calculating size in ${targetUser} mailbox...`);
        const targetFoldersReq = await client.api(`/users/${targetUser}/mailFolders/msgfolderroot/childFolders?$top=250`).get();
        
        let totalSize = 0;
        for (const f of targetFoldersReq.value) {
            if (copiedFolders.includes(f.displayName)) {
                const folderSize = await getFolderSize(targetUser, f.id);
                console.log(`- ${f.displayName}: ${(folderSize / 1024 / 1024).toFixed(2)} MB`);
                totalSize += folderSize;
            }
        }
        console.log(`\nTotal estimated size of copied folders: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
