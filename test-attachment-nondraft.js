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
        const targetUser = "jan.reyneke@partner.eqncs.com";
        const messagePayload = {
            subject: "Test Attachment Non-Draft",
            body: { contentType: "text", content: "Testing attachment." },
            singleValueExtendedProperties: [
                {
                    id: "Integer 0x0E07",
                    value: "1"
                }
            ]
        };
        const res = await client.api(`/users/${targetUser}/messages`).post(messagePayload);
        console.log("Created message. ID:", res.id, "isDraft:", res.isDraft);
        
        // Add attachment
        const attPayload = {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: "test.txt",
            contentBytes: Buffer.from("Hello world").toString("base64")
        };
        await client.api(`/users/${targetUser}/messages/${res.id}/attachments`).post(attPayload);
        console.log("Added attachment!");
        
        const check = await client.api(`/users/${targetUser}/messages/${res.id}?$select=subject,isDraft,hasAttachments`).get();
        console.log(`isDraft: ${check.isDraft}, hasAttachments: ${check.hasAttachments}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
