import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getCommands, saveCommands } from '@/lib/db';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: userId } = await params;
        
        // 1. Get Agent ID via Graph (Serial Number)
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: ['https://graph.microsoft.com/.default'],
        });
        const client = Client.initWithMiddleware({ authProvider });

        const deviceRes = await client.api('/deviceManagement/managedDevices')
            .filter(`userId eq '${userId}'`)
            .select('serialNumber')
            .get();
        
        const serials = (deviceRes.value || []).map((d: any) => (d.serialNumber || "").toLowerCase().trim());
        if (serials.length === 0) {
            return NextResponse.json({ error: 'No managed devices found for this user' }, { status: 404 });
        }

        const agentsMap: any = await getAgents();
        const agentId = Object.keys(agentsMap).find(id => {
            const agentSerial = (agentsMap[id].serialNumber || "").toLowerCase().trim();
            return serials.includes(agentSerial);
        });

        if (!agentId) {
            return NextResponse.json({ error: 'Unified Agent not installed on user devices' }, { status: 404 });
        }

        // 2. Queue SCAN_DEVICE command
        const allCommands = await getCommands();
        const newCommand = {
            id: crypto.randomUUID(),
            agentId,
            type: 'SCAN_DEVICE',
            payload: {},
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        await saveCommands([...allCommands, newCommand]);

        return NextResponse.json({ success: true, commandId: newCommand.id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
