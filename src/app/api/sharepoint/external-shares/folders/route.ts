import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // 1. Search for the site
        const siteSearch = await client.api('/sites?search=SharesForexternalusers').get();
        if (!siteSearch.value || siteSearch.value.length === 0) {
            throw new Error("Could not find site SharesForexternalusers");
        }
        const siteId = siteSearch.value[0].id;

        // 2. Get the drives for the site
        const drives = await client.api(`/sites/${siteId}/drives`).get();
        if (!drives.value || drives.value.length === 0) {
            throw new Error("Could not find document library for site");
        }
        const driveId = drives.value[0].id;

        // 3. Get the children of the drive root
        const response = await client.api(`/drives/${driveId}/root/children`)
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
