import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await request.json();
        const client = getGraphClient();
        
        const { type, targetId, driveId, permissionId } = body;

        let success = false;
        let message = '';

        if (type === 'group') {
            // Remove user from M365/Security Group
            // Note: Cannot easily remove from dynamic groups via API like this.
            await client.api(`/groups/${targetId}/members/${id}/$ref`).delete();
            success = true;
            message = 'Successfully removed from group.';
        } else if (type === 'directoryRole') {
            // Remove user from Directory Role
            // Need to find the role assignment ID first
            const assignmentsRes = await client.api('/roleManagement/directory/roleAssignments')
                .filter(`principalId eq '${id}' and roleDefinitionId eq '${targetId}'`)
                .get();
                
            if (assignmentsRes.value && assignmentsRes.value.length > 0) {
                const assignmentId = assignmentsRes.value[0].id;
                await client.api(`/roleManagement/directory/roleAssignments/${assignmentId}`).delete();
                success = true;
                message = 'Successfully removed from directory role.';
            } else {
                throw new Error("Role assignment not found.");
            }
        } else if (type === 'driveItem' && driveId && permissionId) {
            // Remove direct share on a DriveItem
            await client.api(`/drives/${driveId}/items/${targetId}/permissions/${permissionId}`).delete();
            success = true;
            message = 'Successfully removed direct permission from item.';
        } else {
            throw new Error("Invalid revocation type or missing parameters.");
        }

        return NextResponse.json({ success, message });
    } catch (error: any) {
        console.error('[API] Revocation Error:', error.message);
        return NextResponse.json(
            { error: "Failed to revoke access", details: error.message },
            { status: 500 }
        );
    }
}
