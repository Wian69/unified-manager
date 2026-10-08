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
        const sourceUser = "jan.reyneke@eqncs.com";
        const targetUser = "jan.reyneke@partner.eqncs.com";
        
        // Find one message to test
        const inbox = (await client.api(`/users/${sourceUser}/mailFolders`).get()).value.find(f => f.displayName === "Inbox");
        const msg = (await client.api(`/users/${sourceUser}/mailFolders/${inbox.id}/messages?$top=1`).get()).value[0];
        
        console.log(`Original received: ${msg.receivedDateTime}, Original subject: ${msg.subject}`);
        
        // Get MIME as ArrayBuffer to properly base64 encode it
        const mimeBuffer = await client.api(`/users/${sourceUser}/messages/${msg.id}/$value`).responseType('arraybuffer').get();
        const base64Mime = Buffer.from(mimeBuffer).toString('base64');
        
        // Post MIME
        const postRes = await client.api(`/users/${targetUser}/messages`).header('Content-Type', 'text/plain').post(base64Mime);
        
        const check = await client.api(`/users/${targetUser}/messages/${postRes.id}?$select=subject,isDraft,receivedDateTime`).get();
        console.log(`Copied received: ${check.receivedDateTime}`);
        console.log(`Copied isDraft: ${check.isDraft}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
