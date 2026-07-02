import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const client = getGraphClient();

        // 1. Revoke Sessions
        try {
            await client.api(`/users/${userId}/revokeSignInSessions`).post({});
            console.log(`[Final Removal] Revoked sessions for ${userId}`);
        } catch (e) {
            console.error(`[Final Removal] Error revoking sessions:`, e);
        }

        // 2. Disable Account
        try {
            await client.api(`/users/${userId}`).patch({ accountEnabled: false });
            console.log(`[Final Removal] Disabled account for ${userId}`);
        } catch (e) {
            console.error(`[Final Removal] Error disabling account:`, e);
        }

        // 3. Remove from all groups
        try {
            const memberOf = await client.api(`/users/${userId}/memberOf`).get();
            const groups = memberOf.value || [];
            for (const group of groups) {
                if (group['@odata.type'] === '#microsoft.graph.group') {
                    await client.api(`/groups/${group.id}/members/${userId}/$ref`).delete();
                    console.log(`[Final Removal] Removed ${userId} from group ${group.id}`);
                }
            }
        } catch (e) {
            console.error(`[Final Removal] Error removing from groups:`, e);
        }

        // 4. Remove all licenses
        try {
            const user = await client.api(`/users/${userId}`).select('assignedLicenses').get();
            const assignedLicenses = user.assignedLicenses || [];
            const skuIdsToRemove = assignedLicenses.map((l: any) => l.skuId);
            
            if (skuIdsToRemove.length > 0) {
                await client.api(`/users/${userId}/assignLicense`).post({
                    addLicenses: [],
                    removeLicenses: skuIdsToRemove
                });
                console.log(`[Final Removal] Removed licenses for ${userId}`);
            }
        } catch (e) {
            console.error(`[Final Removal] Error removing licenses:`, e);
        }

        return NextResponse.json({ success: true, message: "Final removal completed." });
    } catch (error: any) {
        console.error("[Final Removal] Error:", error);
        return NextResponse.json({ error: error.message || "Failed to execute final removal" }, { status: 500 });
    }
}
