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
        
        async function fetchAllInternetMessageIds(userId, folderId) {
            const ids = new Set();
            let url = `/users/${userId}/mailFolders/${folderId}/messages?$select=internetMessageId&$top=999`;
            while (url) {
                const res = await client.api(url).get();
                for (const msg of res.value) {
                    if (msg.internetMessageId) ids.add(msg.internetMessageId);
                }
                url = res['@odata.nextLink'];
            }
            return ids;
        }
        
        async function copyMissingMessages(srcId, dstId, folderName) {
            console.log(`Checking for missing messages in ${folderName}...`);
            const existingTargetIds = await fetchAllInternetMessageIds(targetUser, dstId);
            
            let url = `/users/${sourceUser}/mailFolders/${srcId}/messages?$top=50`;
            let migratedCount = 0;
            
            while (url) {
                const msgsRes = await client.api(url).get();
                for (const msg of msgsRes.value) {
                    if (existingTargetIds.has(msg.internetMessageId)) {
                        continue; // Already migrated
                    }
                    
                    console.log(`  -> Found missing msg (moved recently): ${msg.subject}`);
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
            if (migratedCount > 0) {
                console.log(`Finished ${folderName}: ${migratedCount} missing emails synced.`);
            }
        }
        
        async function syncFolderRecursively(srcFolderId, dstFolderId, currentPath) {
            await copyMissingMessages(srcFolderId, dstFolderId, currentPath);
            
            const childrenReq = await client.api(`/users/${sourceUser}/mailFolders/${srcFolderId}/childFolders?$top=999`).get();
            const targetChildrenReq = await client.api(`/users/${targetUser}/mailFolders/${dstFolderId}/childFolders?$top=999`).get();
            const targetChildrenMap = {};
            for (const tChild of targetChildrenReq.value) {
                targetChildrenMap[tChild.displayName] = tChild.id;
            }
            
            for (const child of childrenReq.value) {
                let targetChildId = targetChildrenMap[child.displayName];
                if (!targetChildId) {
                    console.log(`Found NEW subfolder: ${currentPath}/${child.displayName}. Creating...`);
                    const newChild = await client.api(`/users/${targetUser}/mailFolders/${dstFolderId}/childFolders`).post({
                        displayName: child.displayName,
                        isHidden: false
                    });
                    targetChildId = newChild.id;
                }
                await syncFolderRecursively(child.id, targetChildId, `${currentPath}/${child.displayName}`);
            }
        }
        
        console.log("Finding sources in Inbox/Aa Clients...");
        const sourceFolderMap = {};
        async function findSources(folderId = null, path = "") {
            let url = folderId 
                ? `/users/${sourceUser}/mailFolders/${folderId}/childFolders?$top=999`
                : `/users/${sourceUser}/mailFolders?$top=999`;
            const res = await client.api(url).get();
            for (const folder of res.value) {
                const currentPath = path ? `${path}/${folder.displayName}` : folder.displayName;
                if (currentPath.startsWith("Inbox/Aa Clients/") && targetFolders.includes(folder.displayName)) {
                    sourceFolderMap[folder.displayName] = folder.id;
                }
                if (folder.childFolderCount > 0) {
                    await findSources(folder.id, currentPath);
                }
            }
        }
        await findSources();
        
        console.log("Finding existing targets...");
        const targetRes = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        const targetFolderMap = {};
        for (const f of targetRes.value) {
            if (targetFolders.includes(f.displayName)) {
                targetFolderMap[f.displayName] = f.id;
            }
        }
        
        console.log("Starting deep ID-based sync...");
        for (const name of targetFolders) {
            const srcId = sourceFolderMap[name];
            const dstId = targetFolderMap[name];
            if (!srcId || !dstId) {
                console.log(`Missing mapping for ${name}!`);
                continue;
            }
            await syncFolderRecursively(srcId, dstId, name);
        }
        console.log("Deep sync complete!");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
