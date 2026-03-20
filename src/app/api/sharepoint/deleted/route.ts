import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        const client = getGraphClient();

        // SCENARIO 1: Fetch live recycle bin items for a specific user
        if (userId) {
            try {
                // 1. Get user's personal site ID from their drive
                const driveResponse = await client.api(`/users/${userId}/drive`)
                    .select('id,sharepointIds,webUrl')
                    .get();
                
                const siteId = driveResponse.sharepointIds?.siteId;
                if (!siteId) {
                    return NextResponse.json({ 
                        error: "Personal Site (OneDrive) not provisioned. This site is only created after the user signs in to OneDrive for the first time.",
                        isNotProvisioned: true 
                    }, { status: 404 });
                }

                // 2. Fetch live recycle bin items from the site
                const recycleBinResponse = await client.api(`/sites/${siteId}/recycleBin/items`)
                    .select('id,name,size,lastModifiedDateTime,deletedBy,webUrl')
                    .top(100)
                    .get();

                const items = (recycleBinResponse.value || []).map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    size: item.size || 0,
                    deletedDateTime: item.lastModifiedDateTime,
                    deletedBy: item.deletedBy?.user?.displayName || "Unknown",
                    siteUrl: driveResponse.webUrl,
                    webUrl: item.webUrl
                }));

                return NextResponse.json({
                    data: items,
                    totalCount: items.length,
                    totalSize: items.reduce((acc: number, curr: any) => acc + (curr.size || 0), 0),
                    isLive: true
                });
            } catch (innerError: any) {
                if (innerError.statusCode === 404 || innerError.message?.includes('ItemNotFound')) {
                    return NextResponse.json({ 
                        error: "Personal Site (OneDrive) not provisioned. This site is only created after the user signs in to OneDrive for the first time.",
                        isNotProvisioned: true 
                    }, { status: 404 });
                }
                return NextResponse.json({ error: `Graph Error: ${innerError.message}` }, { status: innerError.statusCode || 500 });
            }
        }

        // SCENARIO 2: Default to the 30-day usage report
        const response = await client.api('/reports/getSharePointSiteUsageDetail(period=\'D30\')')
            .get();

        let csvData = '';
        if (response && typeof response === 'object' && (response as any).getReader) {
            const reader = (response as any).getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                csvData += decoder.decode(value, { stream: true });
            }
        } else if (typeof response === 'string') {
            csvData = response;
        } else if (Buffer.isBuffer(response)) {
            csvData = response.toString('utf-8');
        }

        if (!csvData) {
            return NextResponse.json({ data: [] });
        }

        const cleanCsvData = csvData.replace(/^\uFEFF/, '').replace(/\u00A0/g, ' ');
        const lines = cleanCsvData.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        if (lines.length < 1) return NextResponse.json({ data: [] });

        let headerRowIdx = -1;
        let headers: string[] = [];
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const h = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
            if (h.some(item => item.toLowerCase().includes('site url'))) {
                headerRowIdx = i;
                headers = h;
                break;
            }
        }

        if (headerRowIdx === -1) {
            return NextResponse.json({ data: [] });
        }

        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const findHeader = (pattern: string) => headers.findIndex(h => normalize(h).includes(normalize(pattern)));
        
        const siteUrlIdx = findHeader('Site URL');
        const ownerIdx = findHeader('Owner Display Name');
        const deletedCountIdx = findHeader('Deleted File Count');
        const deletedSizeIdx = findHeader('Deleted File Size');
        const totalCountIdx = findHeader('File Count');
        const totalSizeIdx = findHeader('Storage Used (Byte)');
        const activeIdx = findHeader('Last Activity Date');

        if (siteUrlIdx === -1) {
            return NextResponse.json({ data: [] });
        }

        const reportData = lines.slice(headerRowIdx + 1)
            .map(line => {
                const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
                
                const deletedCount = deletedCountIdx !== -1 ? (parseInt(values[deletedCountIdx]) || 0) : 0;
                const deletedSize = deletedSizeIdx !== -1 ? (parseInt(values[deletedSizeIdx]) || 0) : 0;
                const totalCount = totalCountIdx !== -1 ? (parseInt(values[totalCountIdx]) || 0) : 0;
                const totalSize = totalSizeIdx !== -1 ? (parseInt(values[totalSizeIdx]) || 0) : 0;

                return {
                    siteUrl: values[siteUrlIdx],
                    owner: values[ownerIdx] || 'Internal Site',
                    deletedFileCount: deletedCount, 
                    deletedFileSize: deletedSize,
                    totalFileCount: totalCount,
                    totalFileSize: totalSize,
                    hasDetailedDeletions: deletedCountIdx !== -1,
                    lastActivity: values[activeIdx] || 'N/A',
                    isPersonal: values[siteUrlIdx]?.includes('-my.sharepoint.com/personal/')
                };
            })
            .filter(item => item.isPersonal);

        return NextResponse.json({
            data: reportData,
            totalDeletedCount: reportData.reduce((acc, curr) => acc + curr.deletedFileCount, 0),
            totalDeletedSize: reportData.reduce((acc, curr) => acc + curr.deletedFileSize, 0),
            totalManagedCount: reportData.reduce((acc, curr) => acc + (curr.totalFileCount || 0), 0)
        });

    } catch (error: any) {
        console.error('[API] Global Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
