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
        const limitDate = "2026-08-07T23:59:59Z";
        
        async function copyMessages(srcId, dstId, folderName) {
            console.log(`Migrating messages for ${folderName}...`);
            let url = `/users/${sourceUser}/mailFolders/${srcId}/messages?$filter=receivedDateTime le ${limitDate}&$top=50`;
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
                    } catch (e) {}
                }
                url = msgsRes['@odata.nextLink'];
            }
            console.log(`Finished messages for ${folderName}: ${migratedCount} migrated.`);
        }
        
        async function syncFolderRecursively(srcFolderId, dstFolderId, currentPath) {
            await copyMessages(srcFolderId, dstFolderId, currentPath);
            const childrenReq = await client.api(`/users/${sourceUser}/mailFolders/${srcFolderId}/childFolders?$top=999`).get();
            for (const child of childrenReq.value) {
                console.log(`Found subfolder: ${currentPath}/${child.displayName}. Creating...`);
                const newChild = await client.api(`/users/${targetUser}/mailFolders/${dstFolderId}/childFolders`).post({
                    displayName: child.displayName,
                    isHidden: false
                });
                await syncFolderRecursively(child.id, newChild.id, `${currentPath}/${child.displayName}`);
            }
        }
        
        // 1. Wipe ONLY Project Nile in target
        console.log("Wiping incorrect Project Nile in target...");
        const targetRes = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        for (const f of targetRes.value) {
            if (f.displayName === "Project Nile") {
                await client.api(`/users/${targetUser}/mailFolders/${f.id}`).delete();
            }
        }
        
        // 2. Find correct Project Nile in source
        console.log("Finding correct Project Nile in Inbox/Aa Clients...");
        let correctSourceId = null;
        async function searchNile(folderId = null, path = "") {
            let url = folderId 
                ? `/users/${sourceUser}/mailFolders/${folderId}/childFolders?$top=999`
                : `/users/${sourceUser}/mailFolders?$top=999`;
                
            const res = await client.api(url).get();
            for (const folder of res.value) {
                const currentPath = path ? `${path}/${folder.displayName}` : folder.displayName;
                if (currentPath === "Inbox/Aa Clients/Project Nile") {
                    correctSourceId = folder.id;
                    return;
                }
                if (folder.childFolderCount > 0 && !correctSourceId) {
                    await searchNile(folder.id, currentPath);
                }
            }
        }
        await searchNile();
        
        if (!correctSourceId) {
            console.log("Could not find correct Project Nile!");
            return;
        }
        
        // 3. Create fresh Project Nile in target
        console.log("Creating fresh root target folder: Project Nile");
        const newF = await client.api(`/users/${targetUser}/mailFolders`).post({
            displayName: "Project Nile",
            isHidden: false
        });
        
        // 4. Sync
        console.log("Starting recursive sync for Project Nile...");
        await syncFolderRecursively(correctSourceId, newF.id, "Project Nile");
        console.log("Project Nile fix complete!");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
