import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Search the Settings Catalog for NTLM related settings
        const response = await client.api('/deviceManagement/settingDefinitions')
            .version('beta')
            .filter("contains(displayName, 'Legacy')")
            .get();

        return NextResponse.json(response.value || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
