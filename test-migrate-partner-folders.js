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
        
        // 1. Wipe & Recreate Target Folders
        console.log("Wiping existing target folders...");
        const res = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        for (const f of res.value) {
            if (targetFolders.includes(f.displayName)) {
                await client.api(`/users/${targetUser}/mailFolders/${f.id}`).delete();
            }
        }
        
        const targetFolderMap = {};
        for (const name of targetFolders) {
            const newF = await client.api(`/users/${targetUser}/mailFolders`).post({
                displayName: name,
                isHidden: false
            });
            targetFolderMap[name] = newF.id;
        }
        
        // 2. Fetch Source Folders recursively
        const sourceFolderMap = {};
        async function fetchSourceFolders(folderId = null) {
            let url = folderId 
                ? `/users/${sourceUser}/mailFolders/${folderId}/childFolders?$top=999`
                : `/users/${sourceUser}/mailFolders?$top=999`;
                
            const res = await client.api(url).get();
            for (const folder of res.value) {
                if (targetFolders.includes(folder.displayName)) {
                    sourceFolderMap[folder.displayName] = folder.id;
                }
                if (folder.childFolderCount > 0) {
                    await fetchSourceFolders(folder.id);
                }
            }
        }
        await fetchSourceFolders();
        
        // 3. Migrate
        const limitDate = "2026-08-07T23:59:59Z";
        
        for (const folderName of targetFolders) {
            const srcId = sourceFolderMap[folderName];
            const dstId = targetFolderMap[folderName];
            
            if (!srcId || !dstId) {
                console.log(`Missing folder mapping for ${folderName}!`);
                continue;
            }
            
            console.log(`Migrating ${folderName}...`);
            
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
                            { id: "Integer 0x0E07", value: "1" }, // NOT A DRAFT
                            { id: "SystemTime 0x0E06", value: rDate }, // Received Date
                            { id: "SystemTime 0x0039", value: sDate } // Sent Date
                        ]
                    };
                    
                    try {
                        const newMsg = await client.api(`/users/${targetUser}/mailFolders/${dstId}/messages`).post(payload);
                        
                        // Handle attachments carefully
                        if (msg.hasAttachments) {
                            const attsReq = await client.api(`/users/${sourceUser}/messages/${msg.id}/attachments`).get();
                            for (const att of attsReq.value) {
                                // Exclude "Item" properties which can cause errors
                                if (att["@odata.type"] === "#microsoft.graph.itemAttachment") {
                                    continue; // Skip embedded emails to avoid complex recursive copying errors
                                }
                                
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
                                } catch (attErr) {
                                    console.log(`Attachment error on ${msg.subject}: ${attErr.message}`);
                                }
                            }
                        }
                        migratedCount++;
                    } catch (e) {
                        console.error(`Error copying msg '${msg.subject}': ${e.message}`);
                    }
                }
                
                url = msgsRes['@odata.nextLink'];
            }
            
            console.log(`Finished ${folderName}: ${migratedCount} emails migrated.`);
        }
        console.log("Full migration complete.");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
