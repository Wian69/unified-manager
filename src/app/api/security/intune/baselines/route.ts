import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch all templates (Security Baselines)
        const response = await client.api('/deviceManagement/templates').get();

        const templates = response.value || [];
        const securityBaselines = templates.filter((t: any) => 
            t.displayName.toLowerCase().includes('security') || 
            t.displayName.toLowerCase().includes('baseline')
        );

        return NextResponse.json({
            count: securityBaselines.length,
            baselines: securityBaselines.map((t: any) => ({
                id: t.id,
                name: t.displayName,
                description: t.description
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
