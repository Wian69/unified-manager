import { NextResponse } from 'next/server';
import { getPowerAutomateToken } from '@/lib/powerautomate';

export const dynamic = 'force-dynamic';

const ENV_ID = 'Default-5d57c9a9-b1b5-4cd2-be8c-14b00490163d';

export async function GET() {
    try {
        const token = await getPowerAutomateToken();
        
        const response = await fetch(`https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/${ENV_ID}/flows?api-version=2016-11-01`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Flow API Error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        
        return NextResponse.json({
            flows: data.value || []
        });
    } catch (error: any) {
        console.error('[API] Flows List Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch cloud flows", details: error.message },
            { status: 500 }
        );
    }
}
