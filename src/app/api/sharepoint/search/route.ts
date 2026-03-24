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
        
        // Use Microsoft Graph Search API to query both SharePoint and OneDrive
        const searchResponse = await client.api('/search/query').post({
            requests: [
                {
                    entityTypes: ['driveItem'],
                    query: {
                        queryString: query
                    },
                    from: 0,
                    size: 50,
                    fields: [
                        'id',
                        'name',
                        'webUrl',
                        'size',
                        'lastModifiedDateTime',
                        'parentReference',
                        'file'
                    ]
                }
            ]
        });

        const hits = searchResponse.value?.[0]?.hitsContainers?.[0]?.hits || [];
        
        // Transform the results into a cleaner format
        const results = hits.map((hit: any) => {
            const item = hit.resource;
            return {
                id: item.id,
                name: item.name,
                webUrl: item.webUrl,
                size: item.size,
                lastModified: item.lastModifiedDateTime,
                parentPath: item.parentReference?.path || 'Root',
                siteName: item.parentReference?.siteId ? 'SharePoint Site' : 'Personal OneDrive',
                type: item.file?.mimeType || 'Folder'
            };
        });

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('[API] SharePoint Search Error:', error.message);
        return NextResponse.json(
            { error: "Search failed", details: error.message },
            { status: 500 }
        );
    }
}
