import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sourceUserId, targetEmail, role } = body;

        if (!sourceUserId || !targetEmail || !role) {
            return NextResponse.json({ error: "Missing required fields: sourceUserId, targetEmail, role" }, { status: 400 });
        }

        const client = getGraphClient();

        // Check if permission already exists to update it, or just create it
        // Graph API calendarPermissions endpoint: POST /users/{id}/calendar/calendarPermissions
        
        const permissionPayload = {
            emailAddress: {
                address: targetEmail,
                name: targetEmail
            },
            isInsideOrganization: true,
            isRemovable: true,
            role: role // 'read', 'write', 'delegateWithoutPrivateEventAccess', 'delegateWithPrivateEventAccess'
        };

        try {
            await client.api(`/users/${sourceUserId}/calendar/calendarPermissions`).post(permissionPayload);
            console.log(`[Calendar] Granted ${role} access for ${targetEmail} on ${sourceUserId}'s calendar`);
        } catch (e: any) {
            // If it already exists (409 Conflict), we can PATCH it instead
            if (e.statusCode === 409) {
                console.log(`[Calendar] Permission already exists, attempting to update...`);
                // We need the permission ID to update it. The ID is usually the base64 encoded email or generated ID.
                // It's safer to fetch the existing permissions, find the matching email, and then patch it.
                const existingPerms = await client.api(`/users/${sourceUserId}/calendar/calendarPermissions`).get();
                const perm = existingPerms.value.find((p: any) => p.emailAddress?.address?.toLowerCase() === targetEmail.toLowerCase());
                
                if (perm) {
                    await client.api(`/users/${sourceUserId}/calendar/calendarPermissions/${perm.id}`).patch({ role: role });
                    console.log(`[Calendar] Updated existing access to ${role} for ${targetEmail}`);
                } else {
                    throw e;
                }
            } else {
                throw e;
            }
        }

        return NextResponse.json({ success: true, message: `Successfully granted ${role} access to ${targetEmail}.` });
    } catch (error: any) {
        console.error("[Calendar] Error:", error);
        return NextResponse.json({ error: error.message || "Failed to execute calendar delegation" }, { status: 500 });
    }
}
