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
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // 1. List Managed App Registrations for the user
        // Note: Filter by the user's ID or UPN
        const registrations = await graphClient
            .api(`/deviceManagement/managedAppRegistrations`)
            .filter(`userId eq '${userId}'`)
            .get();

        const results = [];

        // 2. Trigger Selective Wipe for each registration
        for (const reg of registrations.value) {
            try {
                await graphClient
                    .api(`/deviceManagement/managedAppRegistrations/${reg.id}/wipe`)
                    .post({});
                results.push({ id: reg.id, status: "Wipe initiated" });
            } catch (err: any) {
                results.push({ id: reg.id, status: "Error", message: err.message });
            }
        }

        return NextResponse.json({
            message: `Wipe requests generated for ${results.length} app registrations`,
            details: results
        });

    } catch (error: any) {
        console.error("Selective Wipe Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
