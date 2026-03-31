import { NextResponse, NextRequest } from 'next/server';
import { getPowerAutomateToken } from '@/lib/powerautomate';

export const dynamic = 'force-dynamic';

const DATAVERSE_URL = 'https://eqnoutsourcedservicessaptyltddef.api.crm4.dynamics.com';

export async function GET(request: NextRequest, { params }: { params: Promise<{ flowId: string }> }) {
    const { flowId } = await params;
    try {
        const token = await getPowerAutomateToken();
        
        const url = `${DATAVERSE_URL}/api/data/v9.2/workflows(${flowId})?$select=name,statecode,modifiedon,createdon,description,clientdata`;
        const response = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`Dataverse API Error: ${response.status}`);
        const f = await response.json();
        
        // Map to format
        const data = {
            id: f.workflowid,
            name: f.name,
            properties: {
                displayName: f.name,
                state: f.statecode === 1 ? 'Started' : 'Stopped',
                createdTime: f.createdon,
                lastModifiedTime: f.modifiedon,
                description: f.description,
                definition: f.clientdata ? JSON.parse(f.clientdata) : {}
            }
        };
        
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ flowId: string }> }) {
    const { flowId } = await params;
    try {
        const body = await request.json();
        const token = await getPowerAutomateToken();
        
        // Handle Start/Stop specifically
        if (body.state) {
            const isStarting = body.state === 'Started';
            const patchBody = {
                statecode: isStarting ? 1 : 0,
                statuscode: isStarting ? 2 : 1
            };
            
            const response = await fetch(`${DATAVERSE_URL}/api/data/v9.2/workflows(${flowId})`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                },
                body: JSON.stringify(patchBody)
            });
            
            if (!response.ok) throw new Error(`Failed to update flow state in Dataverse: ${response.status}`);
            return NextResponse.json({ success: true, state: body.state });
        }

        // Handle updating the flow definition (clientdata in Dataverse)
        if (body.properties && body.properties.definition) {
             const response = await fetch(`${DATAVERSE_URL}/api/data/v9.2/workflows(${flowId})`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0'
                },
                body: JSON.stringify({
                    clientdata: JSON.stringify(body.properties.definition)
                })
            });
            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Failed to update flow definition: ${errBody}`);
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid PATCH body" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
