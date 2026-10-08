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

async function searchFolders(user, parentId = 'msgfolderroot', path = '') {
    const res = await client.api(`/users/${user}/mailFolders/${parentId}/childFolders?$top=250`).get();
    let folders = [];
    for (const f of res.value) {
        const fullPath = path ? `${path}/${f.displayName}` : f.displayName;
        folders.push({ name: f.displayName, id: f.id, fullPath, childFolderCount: f.childFolderCount });
        if (f.childFolderCount > 0) {
            const children = await searchFolders(user, f.id, fullPath);
            folders = folders.concat(children);
        }
    }
    return folders;
}

async function copyFolder(sourceUser, targetUser, sourceFolder, targetParentFolderId) {
    console.log(`Creating folder: ${sourceFolder.name}`);
    let targetFolder;
    try {
        targetFolder = await client.api(`/users/${targetUser}/mailFolders/${targetParentFolderId}/childFolders`).post({
            displayName: sourceFolder.name
        });
    } catch (e) {
        if (e.code === 'ErrorFolderExists') {
            const existingFolders = await client.api(`/users/${targetUser}/mailFolders/${targetParentFolderId}/childFolders?$top=250`).get();
            const found = existingFolders.value.find(f => f.displayName.toLowerCase() === sourceFolder.name.toLowerCase());
            if (found) {
                targetFolder = found;
            } else {
                throw new Error(`Folder exists but couldn't be retrieved: ${sourceFolder.name}`);
            }
        } else {
            throw e;
        }
    }

    console.log(`Copying messages for: ${sourceFolder.name}`);
    let hasNextMsg = true;
    let msgUrl = `/users/${sourceUser}/mailFolders/${sourceFolder.id}/messages?$top=50`;
    
    let totalCopied = 0;
    while (hasNextMsg && msgUrl) {
        const msgs = await client.api(msgUrl).header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly').get();
        
        for (const msg of msgs.value) {
            try {
                const fullMsg = await client.api(`/users/${sourceUser}/messages/${msg.id}`).get();
                
                let msgFlags = fullMsg.isRead ? "1" : "0";
                
                const newMsg = {
                    subject: fullMsg.subject,
                    body: fullMsg.body,
                    toRecipients: fullMsg.toRecipients,
                    ccRecipients: fullMsg.ccRecipients,
                    bccRecipients: fullMsg.bccRecipients,
                    from: fullMsg.from,
                    sender: fullMsg.sender,
                    isRead: fullMsg.isRead,
                    importance: fullMsg.importance,
                    singleValueExtendedProperties: [
                        {
                            id: "SystemTime 0x0E06",
                            value: fullMsg.receivedDateTime
                        },
                        {
                            id: "Integer 0x0E07",
                            value: msgFlags
                        }
                    ]
                };

                await client.api(`/users/${targetUser}/mailFolders/${targetFolder.id}/messages`).post(newMsg);
                totalCopied++;
                if (totalCopied % 10 === 0) {
                    console.log(`... copied ${totalCopied} messages in ${sourceFolder.name}`);
                }
            } catch (err) {
                console.error(`Failed to copy message ${msg.subject}: ${err.message}`);
            }
        }
        
        if (msgs['@odata.nextLink']) {
            msgUrl = msgs['@odata.nextLink'];
        } else {
            hasNextMsg = false;
        }
    }
    console.log(`Finished copying ${totalCopied} messages in ${sourceFolder.name}`);

    // If recursive copy is needed, do it here. The previous script supported recursive copy.
    // For now, assuming they want all child folders of these as well.
    if (sourceFolder.childFolderCount > 0) {
         console.log(`Folder ${sourceFolder.name} has children, they will be copied next by the search loop if included, but if not, we must explicitly copy them... wait.`);
         // Actually, if we just use the original script's recursive logic, it's safer.
         // Let's implement full recursive copy for these specific folders.
    }
}

async function copyFolderRecursively(sourceUser, targetUser, sourceFolderId, sourceFolderName, targetParentFolderId) {
    console.log(`Creating folder: ${sourceFolderName}`);
    let targetFolder;
    try {
        targetFolder = await client.api(`/users/${targetUser}/mailFolders/${targetParentFolderId}/childFolders`).post({
            displayName: sourceFolderName
        });
    } catch (e) {
        if (e.code === 'ErrorFolderExists') {
            const existingFolders = await client.api(`/users/${targetUser}/mailFolders/${targetParentFolderId}/childFolders?$top=250`).get();
            const found = existingFolders.value.find(f => f.displayName.toLowerCase() === sourceFolderName.toLowerCase());
            if (found) {
                targetFolder = found;
            } else {
                throw new Error(`Folder exists but couldn't be retrieved: ${sourceFolderName}`);
            }
        } else {
            throw e;
        }
    }

    console.log(`Copying messages for: ${sourceFolderName}`);
    let hasNextMsg = true;
    let msgUrl = `/users/${sourceUser}/mailFolders/${sourceFolderId}/messages?$top=50`;
    
    let totalCopied = 0;
    while (hasNextMsg && msgUrl) {
        const msgs = await client.api(msgUrl).header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly').get();
        
        for (const msg of msgs.value) {
            try {
                const fullMsg = await client.api(`/users/${sourceUser}/messages/${msg.id}`).get();
                
                let msgFlags = fullMsg.isRead ? "1" : "0";
                
                const newMsg = {
                    subject: fullMsg.subject,
                    body: fullMsg.body,
                    toRecipients: fullMsg.toRecipients,
                    ccRecipients: fullMsg.ccRecipients,
                    bccRecipients: fullMsg.bccRecipients,
                    from: fullMsg.from,
                    sender: fullMsg.sender,
                    isRead: fullMsg.isRead,
                    importance: fullMsg.importance,
                    singleValueExtendedProperties: [
                        {
                            id: "SystemTime 0x0E06",
                            value: fullMsg.receivedDateTime
                        },
                        {
                            id: "Integer 0x0E07",
                            value: msgFlags
                        }
                    ]
                };

                await client.api(`/users/${targetUser}/mailFolders/${targetFolder.id}/messages`).post(newMsg);
                totalCopied++;
                if (totalCopied % 10 === 0) {
                    console.log(`... copied ${totalCopied} messages in ${sourceFolderName}`);
                }
            } catch (err) {
                console.error(`Failed to copy message ${msg.subject}: ${err.message}`);
            }
        }
        
        if (msgs['@odata.nextLink']) {
            msgUrl = msgs['@odata.nextLink'];
        } else {
            hasNextMsg = false;
        }
    }
    console.log(`Finished copying ${totalCopied} messages in ${sourceFolderName}`);

    // Recursively copy subfolders
    const sourceFolder = await client.api(`/users/${sourceUser}/mailFolders/${sourceFolderId}`).get();
    if (sourceFolder.childFolderCount > 0) {
        let hasNextSub = true;
        let subUrl = `/users/${sourceUser}/mailFolders/${sourceFolderId}/childFolders?$top=50`;
        
        while (hasNextSub && subUrl) {
            const subFolders = await client.api(subUrl).get();
            for (const sub of subFolders.value) {
                await copyFolderRecursively(sourceUser, targetUser, sub.id, sub.displayName, targetFolder.id);
            }
            if (subFolders['@odata.nextLink']) {
                subUrl = subFolders['@odata.nextLink'];
            } else {
                hasNextSub = false;
            }
        }
    }
}


async function run() {
    const sourceUser = "jan.reyneke@eqncs.com";
    const targetUser = "jan.reyneke@partner.eqncs.com";
    const foldersToCopy = [
        "Alexander Forbes",
        "Bravura",
        "Micro Property Development Fund",
        "Project Nile",
        "SolarAfrica De Aar 2",
        "SolarAfrica De Aar 3",
        "SolarAfrica Energy",
        "SolarAfrica Sun Central Holdings",
        "Thane Capital"
    ].map(n => n.trim().toLowerCase());
    
    try {
        console.log("Fetching ALL folders in source...");
        const sourceFolders = await searchFolders(sourceUser);
        
        for (const f of sourceFolders) {
            if (foldersToCopy.includes(f.name.toLowerCase())) {
                console.log(`Found matching folder to copy: ${f.name} (fullPath: ${f.fullPath})`);
                await copyFolderRecursively(sourceUser, targetUser, f.id, f.name, 'msgfolderroot');
            }
        }
        console.log("Selective copy complete.");
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
