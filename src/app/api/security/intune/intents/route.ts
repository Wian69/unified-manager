import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch Endpoint Security Intents (where Account Protection / Credential Guard often live)
        // We use the beta-style path via the standard client (Graph allows this)
        const response = await client.api('/deviceManagement/intents').get();

        const intents = response.value || [];
        const credentialGuardIntents = intents.filter((i: any) => 
            i.displayName.toLowerCase().includes('credential') || 
            i.displayName.toLowerCase().includes('account') ||
            i.displayName.toLowerCase().includes('protection')
        );

        return NextResponse.json({
            count: credentialGuardIntents.length,
            intents: credentialGuardIntents.map((i: any) => ({
                id: i.id,
                name: i.displayName,
                templateId: i.templateId
            }))
        });
    } catch (error: any) {
        console.error('[API] Intents check failed:', error.message);
        return NextResponse.json(
            { error: "Failed to check Intents status", details: error.message },
            { status: 500 }
        );
    }
}
