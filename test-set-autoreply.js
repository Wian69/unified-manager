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
        const targetUser = "adm_wian@eqncs.com";
        const replyMessage = `
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <p>Hello,</p>
                    <p>Please note that <strong>adm_wian@eqncs.com</strong> is a non-monitored administrative mailbox.</p>
                    <p>If you have any IT-related queries or require support, please send an email directly to <strong>itsupport@eqncs.com</strong>.</p>
                    <p>Thank you.</p>
                </body>
            </html>
        `;

        const payload = {
            automaticRepliesSetting: {
                status: "alwaysEnabled",
                externalAudience: "all",
                internalReplyMessage: "", // Set internal to empty!
                externalReplyMessage: replyMessage
            }
        };

        console.log(`Updating Auto-Reply for ${targetUser} to external ONLY...`);
        await client.api(`/users/${targetUser}/mailboxSettings`).patch(payload);
        console.log("Successfully removed internal auto-reply and kept external active!");

    } catch (e) {
        console.error("Error:", e.message);
        if (e.body) console.error(JSON.stringify(e.body, null, 2));
    }
}
run();
