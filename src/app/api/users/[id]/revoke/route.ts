import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await request.json();
        const client = getGraphClient();
        
        const tasks = Array.isArray(body) ? body : [body];
        const results = [];
        const errors = [];

        await Promise.allSettled(tasks.map(async (task) => {
            const { type, targetId, driveId, permissionId } = task;
            try {
                if (type === 'group') {
                    await client.api(`/groups/${targetId}/members/${id}/$ref`).delete();
                    results.push({ name: task.name, success: true });
                } else if (type === 'directoryRole') {
                    const assignmentsRes = await client.api('/roleManagement/directory/roleAssignments')
                        .filter(`principalId eq '${id}' and roleDefinitionId eq '${targetId}'`)
                        .get();
                        
                    if (assignmentsRes.value && assignmentsRes.value.length > 0) {
                        const assignmentId = assignmentsRes.value[0].id;
                        await client.api(`/roleManagement/directory/roleAssignments/${assignmentId}`).delete();
                        results.push({ name: task.name, success: true });
                    } else {
                        throw new Error("Role assignment not found.");
                    }
                } else if (type === 'driveItem' && driveId && permissionId) {
                    await client.api(`/drives/${driveId}/items/${targetId}/permissions/${permissionId}`).delete();
                    results.push({ name: task.name, success: true });
                } else {
                    throw new Error("Invalid revocation type or missing parameters.");
                }
            } catch (error: any) {
                errors.push(`Failed to revoke ${task.name || targetId}: ${error.message}`);
            }
        }));

        if (errors.length > 0) {
            return NextResponse.json({ success: false, error: "Partial success", details: errors.join(', ') });
        }

        return NextResponse.json({ success: true, message: `Successfully processed ${results.length} revocations.` });
    } catch (error: any) {
        console.error('[API] Revocation Error:', error.message);
        return NextResponse.json(
            { error: "Failed to revoke access", details: error.message },
            { status: 500 }
        );
    }
}
