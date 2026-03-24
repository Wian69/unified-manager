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

        // Ultimate Global Search: Using wildcard and KQL for maximum discovery
        // NOTE: 'region' is required when using Application Permissions (Client Secret)
        const searchResponse = await client.api('/search/query').post({
            requests: [
                {
                    entityTypes: ['driveItem', 'listItem'],
                    query: {
                        // Using wildcard and broad KQL to catch as much as possible
                        // 'path' constraint ensures we look at both SharePoint and Personal OneDrives
                        queryString: `(${query}* OR filename:${query}*)`
                    },
                    region: "ZAF",
                    from: 0,
                    size: 100,
                    trimDuplicates: false,
                    fields: [
                        'id', 'name', 'webUrl', 'size', 'lastModifiedDateTime', 
                        'parentReference', 'file', 'listItem', 'fields'
                    ]
                }
            ]
        });

        console.log(`[SEARCH] Response received: ${JSON.stringify(searchResponse).substring(0, 200)}...`);

        const hits = searchResponse.value?.[0]?.hitsContainers?.[0]?.hits || [];
        
        // Transform the results into a cleaner format
        const results = hits.map((hit: any) => {
            const item = hit.resource;
            
            // Extract URL (handle both driveItem and listItem formats)
            const url = item.webUrl || item.fields?.LinkFilename || hit.summary || "#";
            
            // Extract Name (prioritize multiple fields)
            const name = item.name || 
                        item.listItem?.fields?.FileLeafRef || 
                        item.fields?.FileLeafRef || 
                        item.fields?.LinkFilename || 
                        "Unknown File";
            
            // Extract Location Heuristic
            const isOneDrive = url.includes("-my.sharepoint.com") || (!item.parentReference?.siteId && !item.parentReference?.sharepointIds);

            // Extract Type
            const mimeType = item.file?.mimeType || 
                             (url.endsWith('.pdf') ? 'application/pdf' : 
                              url.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 
                              'Document');

            return {
                id: item.id || hit.id || hit.hitId,
                name: name,
                webUrl: url,
                size: item.size || item.fields?.File_x0020_Size || 0,
                lastModified: item.lastModifiedDateTime || item.fields?.Modified || new Date().toISOString(),
                parentPath: item.parentReference?.path || item.fields?.File_x0020_Dir_x0020_Ref || 'Root',
                siteName: isOneDrive ? 'Personal OneDrive' : 'SharePoint Site',
                type: mimeType
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
