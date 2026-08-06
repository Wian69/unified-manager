import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch children of the default document library in the SharesForexternalusers site
        // Using the path-based addressing for sites
        const response = await client.api('/sites/xxeqncs.sharepoint.com:/teams/SharesForexternalusers:/drive/root/children')
            .select('id,name,webUrl,folder')
            .get();

        const items = response.value || [];
        
        // Filter out files, keeping only folders
        const folders = items.filter((item: any) => item.folder !== undefined);

        // Sort alphabetically
        folders.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

        return NextResponse.json({ folders });
    } catch (error: any) {
        console.error('[API] Graph API Error (SharePoint Folders):', error.message);
        
        // If the exact path fails (maybe the site name or URL structure is slightly different), 
        // we return an empty array or a clear error so the UI can handle it gracefully.
        return NextResponse.json(
            { error: "Failed to fetch SharePoint folders. Ensure the site 'SharesForexternalusers' exists and the app has Sites.Read.All permissions.", details: error.message },
            { status: 500 }
        );
    }
}
