import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { controlId, title, scriptContent, groupIds } = body;

        if (!title || !scriptContent || !groupIds || groupIds.length === 0) {
            return NextResponse.json({ error: "Missing required fields (title, scriptContent, or groupIds)" }, { status: 400 });
        }

        const client = getGraphClient();

        // 1. Create the PowerShell script in Intune
        // Base64 encode the script content as required by Microsoft Graph
        const encodedScript = Buffer.from(scriptContent).toString('base64');

        const scriptPayload = {
            displayName: `Remediation: ${title}`,
            description: `Automated remediation created from Security Center for Control ID: ${controlId}`,
            scriptContent: encodedScript,
            runAsAccount: "system",
            enforceSignatureCheck: false,
            fileName: `${title.replace(/\s+/g, '_')}.ps1`,
            roleScopeTagIds: ["0"]
        };

        const createdScript = await client.api('/deviceManagement/deviceManagementScripts')
            .post(scriptPayload);

        const scriptId = createdScript.id;

        // 2. Assign the script to the selected groups
        const assignmentPayload = {
            assignments: groupIds.map((id: string) => ({
                target: {
                    "@odata.type": "#microsoft.graph.groupAssignmentTarget",
                    groupId: id
                }
            }))
        };

        await client.api(`/deviceManagement/deviceManagementScripts/${scriptId}/assign`)
            .post(assignmentPayload);

        return NextResponse.json({ 
            success: true, 
            scriptId, 
            message: `Successfully deployed remediation script to ${groupIds.length} groups.` 
        });

    } catch (error: any) {
        console.error('[API] Remediation Deploy Error:', error.message);
        return NextResponse.json(
            { error: "Failed to deploy remediation", details: error.message },
            { status: 500 }
        );
    }
}
