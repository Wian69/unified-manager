import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const client = getGraphClient();

        console.log('[SecurityAPI] Fetching Windows Update Rings (Comprehensive Check)...');
        
        let allConfigs: any[] = [];

        // 1. Try legacy Update Rings endpoint (v1.0 and Beta)
        try {
            const ringsRes = await client.api('/deviceManagement/windowsUpdateRing').version('beta').get();
            if (ringsRes.value) allConfigs.push(...ringsRes.value.map((r: any) => ({ ...r, source: 'beta/windowsUpdateRing' })));
        } catch (e: any) { console.warn('[SecurityAPI] beta/windowsUpdateRing failed:', e.message); }

        // 2. Try Windows Update Configurations (specific for Win10/11)
        try {
            const configsRes = await client.api('/deviceManagement/windowsUpdateConfigurations').version('beta').get();
            if (configsRes.value) allConfigs.push(...configsRes.value.map((r: any) => ({ ...r, source: 'beta/windowsUpdateConfigurations' })));
        } catch (e: any) { console.warn('[SecurityAPI] windowsUpdateConfigurations failed:', e.message); }

        // 4. Targeted Search for "Windows 11 Updates"
        try {
            const searchRes = await client.api('/deviceManagement/deviceConfigurations').filter("displayName eq 'Windows 11 Updates'").get();
             if (searchRes.value) allConfigs.push(...searchRes.value.map((r: any) => ({ ...r, source: 'targeted/deviceConfigurations' })));
        } catch (e: any) { console.warn('[SecurityAPI] targeted search failed:', e.message); }

        console.log(`[SecurityAPI] Total configurations found: ${allConfigs.length}`);

        return NextResponse.json({
            rings: allConfigs,
            debug: {
                lastSearch: "Windows 11 Updates",
                count: allConfigs.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[SecurityAPI] Error checking updates:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
