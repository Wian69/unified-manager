import { NextRequest, NextResponse } from "next/server";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";

const tenantId = process.env.AZURE_TENANT_ID!;
const clientId = process.env.AZURE_CLIENT_ID!;
const clientSecret = process.env.AZURE_CLIENT_SECRET!;

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
});

const graphClient = Client.initWithMiddleware({ authProvider });

export async function POST(req: NextRequest) {
    try {
        const { userId, personalEmail, displayName } = await req.json();

        if (!personalEmail) {
            return NextResponse.json({ error: "Personal email is required for delivery" }, { status: 400 });
        }

        const mail = {
            subject: `Action Required: Offboarding & Exit Interview Policy - ${displayName}`,
            toRecipients: [
                {
                    emailAddress: {
                        address: personalEmail,
                    },
                },
            ],
            body: {
                content: `
                    <h2>Hello ${displayName},</h2>
                    <p>Attached is your formal Offboarding & Security Audit Record. Please review, sign, and return this document as part of your exit process.</p>
                    <p><strong>Required Actions:</strong></p>
                    <ul>
                        <li>Sign the attached policy document.</li>
                        <li>Ensure all corporate apps (Euphoria, Outlook, Teams) have been uninstalled.</li>
                        <li>Return all company property per the checklist.</li>
                    </ul>
                    <p>Regards,<br/>Equinox Group IT Department</p>
                `,
                contentType: "html",
            },
        };

        // Send the mail using the service account (App Identity)
        // We use the /users/{admin_id}/sendMail or a generic sender if configured
        // For now, we'll try to send as the tenant's default admin or a specific sender
        await graphClient.api("/users/admin@eqncs.com/sendMail").post({ message: mail });

        return NextResponse.json({ message: "Policy delivery email sent successfully" });

    } catch (error: any) {
        console.error("Policy Delivery Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
