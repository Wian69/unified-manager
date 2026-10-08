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
        
        const targetNames = [
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
        
        console.log(`Getting Sent Items ID for ${sourceUser}...`);
        const srcF = await client.api(`/users/${sourceUser}/mailFolders?$top=999`).get();
        const srcSentItemsId = srcF.value.find(f => f.displayName === "Sent Items")?.id;
        if (!srcSentItemsId) throw new Error("Could not find Source Sent Items folder");

        console.log(`Getting Sent Items ID for ${targetUser}...`);
        const dstF = await client.api(`/users/${targetUser}/mailFolders?$top=999`).get();
        const dstSentItemsId = dstF.value.find(f => f.displayName === "Sent Items")?.id;
        if (!dstSentItemsId) throw new Error("Could not find Destination Sent Items folder");

        console.log("Starting keyword search and migration to TARGET SENT ITEMS...");

        for (const name of targetNames) {
            console.log(`\n--- Searching Sent Items for "${name}" ---`);
            let url = `/users/${sourceUser}/mailFolders/${srcSentItemsId}/messages?$search="${name}"&$top=50`;
            let migratedCount = 0;
            
            while (url) {
                const msgsRes = await client.api(url).header('ConsistencyLevel', 'eventual').get();
                
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
                        const newMsg = await client.api(`/users/${targetUser}/mailFolders/${dstSentItemsId}/messages`).post(payload);
                        
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
            console.log(`=> Migrated ${migratedCount} loose emails for "${name}" into partner Sent Items.`);
        }
        console.log("\nFinished completely!");

    } catch (e) {
        console.error("Fatal Error:", e.message);
    }
}
run();
