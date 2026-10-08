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

function ensureMillis(dateString) {
    if (!dateString) return new Date().toISOString();
    return new Date(dateString).toISOString();
}

async function run() {
    try {
        const sourceUser = "jan.reyneke@eqncs.com";
        const targetUser = "jan.reyneke@partner.eqncs.com";
        
        // Root folders we care about
        const targetFolders = [
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
        
        // Helper to copy messages in a specific folder
        async function copyMessages(srcId, dstId, folderName) {
            console.log(`Migrating messages for ${folderName}...`);
            // NO DATE FILTER - FULL COPY
            let url = `/users/${sourceUser}/mailFolders/${srcId}/messages?$top=50`;
            let migratedCount = 0;
            
            while (url) {
                const msgsRes = await client.api(url).get();
                for (const msg of msgsRes.value) {
                    const rDate = ensureMillis(msg.receivedDateTime);
                    const sDate = ensureMillis(msg.sentDateTime || msg.receivedDateTime);
                    const payload = {
                        subject: msg.subject,
                        body: msg.body,
                        sender: msg.sender,
                        from: msg.from,
                        toRecipients: msg.toRecipients,
                        ccRecipients: msg.ccRecipients,
                        bccRecipients: msg.bccRecipients,
                        replyTo: msg.replyTo,
                        importance: msg.importance,
                        isRead: msg.isRead,
                        singleValueExtendedProperties: [
                            { id: "Integer 0x0E07", value: "1" },
                            { id: "SystemTime 0x0E06", value: rDate },
                            { id: "SystemTime 0x0039", value: sDate }
                        ]
                    };
                    
                    try {
                        const newMsg = await client.api(`/users/${targetUser}/mailFolders/${dstId}/messages`).post(payload);
                        if (msg.hasAttachments) {
                            const attsReq = await client.api(`/users/${sourceUser}/messages/${msg.id}/attachments`).get();
                            for (const att of attsReq.value) {
                                if (att["@odata.type"] === "#microsoft.graph.itemAttachment") continue;
                                const attPayload = {
                                    "@odata.type": att["@odata.type"],
                                    name: att.name,
                                    contentType: att.contentType,
                                    isInline: att.isInline,
                                    contentId: att.contentId
                                };
                                if (att.contentBytes) attPayload.contentBytes = att.contentBytes;
                                if (att.contentUrl) attPayload.contentUrl = att.contentUrl;
                                try {
                                    await client.api(`/users/${targetUser}/messages/${newMsg.id}/attachments`).post(attPayload);
                                } catch (attErr) {}
                            }
                        }
                        migratedCount++;
                    } catch (e) {
                        console.error(`Error copying msg '${msg.subject}': ${e.message}`);
                    }
                }
                url = msgsRes['@odata.nextLink'];
            }
            console.log(`Finished messages for ${folderName}: ${migratedCount} migrated.`);
        }
        
        // Helper to recursively map and copy
        async function syncFolderRecursively(srcFolderId, dstFolderId, currentPath) {
            // 1. Copy messages in this folder
            await copyMessages(srcFolderId, dstFolderId, currentPath);
            
            // 2. Fetch children of source folder
            const childrenReq = await client.api(`/users/${sourceUser}/mailFolders/${srcFolderId}/childFolders?$top=999`).get();
            for (const child of childrenReq.value) {
                console.log(`Found subfolder: ${currentPath}/${child.displayName}. Creating...`);
                // Create child in target
                const newChild = await client.api(`/users/${targetUser}/mailFolders/${dstFolderId}/childFolders`).post({
                    displayName: child.displayName,
                    isHidden: false
                });
                
                // Recursively sync the child
                await syncFolderRecursively(child.id, newChild.id, `${currentPath}/${child.displayName}`);
            }
        }
        
        // Start from roots
        console.log("Wiping existing target folders to ensure clean slate...");
        const res = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        for (const f of res.value) {
            if (targetFolders.includes(f.displayName)) {
                await client.api(`/users/${targetUser}/mailFolders/${f.id}`).delete();
            }
        }
        
        // Find sources first (strictly in Inbox/Aa Clients to avoid Sent Items duplicates)
        console.log("Finding true sources in Inbox/Aa Clients...");
        const sourceFolderMap = {};
        async function findSources(folderId = null, path = "") {
            let url = folderId 
                ? `/users/${sourceUser}/mailFolders/${folderId}/childFolders?$top=999`
                : `/users/${sourceUser}/mailFolders?$top=999`;
            const res = await client.api(url).get();
            for (const folder of res.value) {
                const currentPath = path ? `${path}/${folder.displayName}` : folder.displayName;
                // Only bind if it's in the correct parent path to avoid Sent Items
                if (currentPath.startsWith("Inbox/Aa Clients/") && targetFolders.includes(folder.displayName)) {
                    sourceFolderMap[folder.displayName] = folder.id;
                }
                if (folder.childFolderCount > 0) {
                    await findSources(folder.id, currentPath);
                }
            }
        }
        await findSources();
        
        console.log("Starting full recursive sync...");
        for (const name of targetFolders) {
            const srcId = sourceFolderMap[name];
            if (!srcId) {
                console.log(`Missing source folder for ${name}!`);
                continue;
            }
            
            // Re-create root target
            console.log(`Creating root target folder: ${name}`);
            const newF = await client.api(`/users/${targetUser}/mailFolders`).post({
                displayName: name,
                isHidden: false
            });
            
            await syncFolderRecursively(srcId, newF.id, name);
        }
        
        console.log("Full unlimited recursive migration complete!");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
