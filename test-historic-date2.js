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
            subject: "Test Historic Date 2",
            body: { contentType: "text", content: "Testing historic date." },
            singleValueExtendedProperties: [
                { id: "Integer 0x0E07", value: "1" },
                { id: "SystemTime 0x0E06", value: "2024-05-15T12:00:00.000Z" } // Try with milliseconds
            ]
        };
        const res = await client.api(`/users/${targetUser}/messages`).post(messagePayload);
        console.log("Created message. ID:", res.id, "received:", res.receivedDateTime);
    } catch (e) {
        console.error("Error:", e.message);
        if (e.body) console.error(JSON.stringify(e.body, null, 2));
    }
}
run();
