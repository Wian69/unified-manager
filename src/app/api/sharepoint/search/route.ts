import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    console.log(`[API] SharePoint Global Search: "${query}"`);

    try {
        const client = getGraphClient();
        
        console.log(`[SEARCH] Querying Graph with term: ${query}`);

        // Global search for both Drive Items (Files) and List Items (SharePoint/OneDrive content)
        // NOTE: 'region' is required when using Application Permissions (Client Secret)
        const searchResponse = await client.api('/search/query').post({
            requests: [
                {
                    entityTypes: ['driveItem', 'listItem'],
                    query: {
                        queryString: query
                    },
                    region: "ZAF" 
                }
            ]
        });

        console.log(`[SEARCH] Response received: ${JSON.stringify(searchResponse).substring(0, 200)}...`);

        const hits = searchResponse.value?.[0]?.hitsContainers?.[0]?.hits || [];
        
        // Transform the results into a cleaner format
        const results = hits.map((hit: any) => {
            const item = hit.resource;
            const url = item.webUrl || hit.summary || "#";
            
            // Heuristic to identify OneDrive vs SharePoint
            // OneDrive URLs contain "-my.sharepoint.com/personal/"
            const isOneDrive = url.includes("-my.sharepoint.com") || (!item.parentReference?.siteId && !item.parentReference?.sharepointIds);

            return {
                id: item.id || hit.hitId,
                name: item.name || item.listItem?.fields?.FileLeafRef || "Unknown File",
                webUrl: url,
                size: item.size || 0,
                lastModified: item.lastModifiedDateTime || new Date().toISOString(),
                parentPath: item.parentReference?.path || 'Root',
                siteName: isOneDrive ? 'Personal OneDrive' : 'SharePoint Site',
                type: item.file?.mimeType || 'Document'
            };
        });

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('[API] SharePoint Search CRITICAL Error:', {
            message: error.message,
            statusCode: error.statusCode,
            body: error.body ? JSON.parse(error.body) : 'No body'
        });
        return NextResponse.json(
            { error: "Search failed", details: error.message, code: error.statusCode },
            { status: 500 }
        );
    }
}
