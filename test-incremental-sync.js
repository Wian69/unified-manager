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
        const lowerLimitDate = "2026-08-07T23:59:59Z";
        
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
        
        async function copyNewMessages(srcId, dstId, folderName) {
            console.log(`Checking for new messages in ${folderName}...`);
            let url = `/users/${sourceUser}/mailFolders/${srcId}/messages?$filter=receivedDateTime gt ${lowerLimitDate}&$top=50`;
            let migratedCount = 0;
            
            while (url) {
                const msgsRes = await client.api(url).get();
                for (const msg of msgsRes.value) {
                    console.log(`  -> Found new msg: ${msg.subject}`);
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
                console.log(`Finished ${folderName}: ${migratedCount} new emails synced.`);
            }
        }
        
        async function syncFolderRecursively(srcFolderId, dstFolderId, currentPath) {
            await copyNewMessages(srcFolderId, dstFolderId, currentPath);
            
            // Map children of source
            const childrenReq = await client.api(`/users/${sourceUser}/mailFolders/${srcFolderId}/childFolders?$top=999`).get();
            
            // Map children of target to find existing match
            const targetChildrenReq = await client.api(`/users/${targetUser}/mailFolders/${dstFolderId}/childFolders?$top=999`).get();
            const targetChildrenMap = {};
            for (const tChild of targetChildrenReq.value) {
                targetChildrenMap[tChild.displayName] = tChild.id;
            }
            
            for (const child of childrenReq.value) {
                let targetChildId = targetChildrenMap[child.displayName];
                
                // Only create if it somehow doesn't exist (e.g. newly created since August 7)
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
        
        // Find correct sources
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
        
        // Find correct targets in root
        console.log("Finding existing targets...");
        const targetRes = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        const targetFolderMap = {};
        for (const f of targetRes.value) {
            if (targetFolders.includes(f.displayName)) {
                targetFolderMap[f.displayName] = f.id;
            }
        }
        
        console.log("Starting incremental sync for new emails (> Aug 7)...");
        for (const name of targetFolders) {
            const srcId = sourceFolderMap[name];
            const dstId = targetFolderMap[name];
            if (!srcId || !dstId) {
                console.log(`Missing mapping for ${name}! (Src: ${srcId}, Dst: ${dstId})`);
                continue;
            }
            await syncFolderRecursively(srcId, dstId, name);
        }
        
        console.log("Incremental sync complete!");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
