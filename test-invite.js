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
        const url = "https://xxeqncs.sharepoint.com/teams/SharesForexternalusers/Shared%20Documents/Vantage";
        const encodedUrl = Buffer.from(url).toString('base64').replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
        
        console.log("Encoded URL:", encodedUrl);
        const driveItem = await client.api(`/shares/u!${encodedUrl}/driveItem`).get();
        console.log("DriveItem:", JSON.stringify(driveItem, null, 2));

        // Now let's try to invite the user who we just sent an email to.
        // Wait, I will just list permissions to see if the app has access
        const perms = await client.api(`/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/permissions`).get();
        console.log("Permissions:", perms.value.length);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
