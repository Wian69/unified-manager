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
<!DOCTYPE html>
<html>
<head>
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #333333;
    line-height: 1.6;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 20px auto;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  }
  .header {
    background-color: #09203a;
    padding: 25px 30px;
    text-align: center;
  }
  .header img {
    max-width: 250px;
    height: auto;
  }
  .content {
    padding: 30px;
    background-color: #ffffff;
  }
  .title {
    color: #09203a;
    font-size: 20px;
    margin-bottom: 20px;
    font-weight: 600;
  }
  .message {
    font-size: 15px;
    margin-bottom: 20px;
  }
  .footer {
    background-color: #f5f7f9;
    padding: 15px 30px;
    text-align: center;
    font-size: 12px;
    color: #777777;
    border-top: 1px solid #eeeeee;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://eqncs.com/wp-content/uploads/2024/12/footer-logo.png" alt="Equinox Outsourced Services">
    </div>
    <div class="content">
      <div class="title">Automatic Reply</div>
      <div class="message">
        <p>Hello,</p>
        <p>Thank you for reaching out. Please be advised that <strong>adm_wian@eqncs.com</strong> is a non-monitored administrative mailbox used exclusively for system administration.</p>
        <p>If you have any IT-related queries or require technical support, please direct your email to our dedicated support team at <strong><a href="mailto:itsupport@eqncs.com" style="color: #09203a;">itsupport@eqncs.com</a></strong>.</p>
      </div>
    </div>
    <div class="footer">
      &copy; Equinox Outsourced Services. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

        const payload = {
            automaticRepliesSetting: {
                status: "alwaysEnabled",
                externalAudience: "all",
                internalReplyMessage: "", 
                externalReplyMessage: replyMessage
            }
        };

        console.log(`Updating styled Auto-Reply for ${targetUser}...`);
        await client.api(`/users/${targetUser}/mailboxSettings`).patch(payload);
        console.log("Successfully updated the auto-reply with the new HTML template!");

    } catch (e) {
        console.error("Error:", e.message);
        if (e.body) console.error(JSON.stringify(e.body, null, 2));
    }
}
run();
