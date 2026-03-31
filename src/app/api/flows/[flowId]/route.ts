import { NextResponse, NextRequest } from 'next/server';
import { getPowerAutomateToken } from '@/lib/powerautomate';

export const dynamic = 'force-dynamic';

const ENV_ID = 'Default-5d57c9a9-b1b5-4cd2-be8c-14b00490163d';

export async function GET(request: NextRequest, { params }: { params: Promise<{ flowId: string }> }) {
    const { flowId } = await params;
    try {
        const token = await getPowerAutomateToken();
        
        const response = await fetch(`https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/${ENV_ID}/flows/${flowId}?api-version=2016-11-01`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Flow API Error: ${response.status}`);
        const data = await response.json();
        
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
            const action = body.state === 'Started' ? 'start' : 'stop';
            const response = await fetch(`https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/${ENV_ID}/flows/${flowId}/${action}?api-version=2016-11-01`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Failed to ${action} flow`);
            return NextResponse.json({ success: true, state: body.state });
        }

        // Handle updating the flow definition
        if (body.properties) {
             const response = await fetch(`https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/${ENV_ID}/flows/${flowId}?api-version=2016-11-01`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Failed to update flow: ${errBody}`);
            }
            const data = await response.json();
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: "Invalid PATCH body" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
