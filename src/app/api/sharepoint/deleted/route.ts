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
            console.log(`[API] Fetching live recycle bin for user: ${userId}`);
            
            // 1. Get user's personal site ID from their drive
            const driveResponse = await client.api(`/users/${userId}/drive`)
                .select('id,sharepointIds,webUrl')
                .get();
            
            const siteId = driveResponse.sharepointIds?.siteId;
            if (!siteId) {
                return NextResponse.json({ error: "Could not locate personal site for this user" }, { status: 404 });
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
        }

        // SCENARIO 2: Default to the 30-day usage report (existing logic)
        const response = await client.api('/reports/getSharePointSiteUsageDetail(period=\'D30\')')
            .get();

        let csvData = '';
        // ... (rest of the stream reading and CSV parsing logic)

        // Handle ReadableStream (common for Graph Reports in Node.js)
        if (response && typeof response === 'object' && (response as any).getReader) {
            // Web ReadableStream (standard in many modern environments)
            const reader = (response as any).getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                csvData += decoder.decode(value, { stream: true });
            }
            csvData += decoder.decode(); // Final flush
        } else if (response && typeof (response as any).on === 'function') {
            // Node.js Readable stream
            const chunks: any[] = [];
            for await (const chunk of (response as any)) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            csvData = Buffer.concat(chunks).toString('utf-8');
        } else if (typeof response === 'string') {
            csvData = response;
        } else if (Buffer.isBuffer(response)) {
            csvData = response.toString('utf-8');
        }

        if (!csvData || typeof csvData !== 'string') {
            console.error('[API] Failed to extract CSV data from Graph Response:', typeof response);
            return NextResponse.json({ error: "Unexpected response format from Microsoft Graph" }, { status: 500 });
        }

        // Check if it's actually a JSON error hidden in a stream
        if (csvData.trim().startsWith('{')) {
            try {
                const errorObj = JSON.parse(csvData);
                console.error('[API] Graph Error in Stream:', errorObj);
                const message = errorObj.error?.message || "Invalid permission";
                return NextResponse.json({ error: `Access Denied: ${message}` }, { status: 403 });
            } catch (e) {
                // Not JSON, continue
            }
        }

        console.log('[API] CSV Data first line:', csvData.split('\n')[0]);

        // Remove BOM if present and normalize whitespace
        const cleanCsvData = csvData.replace(/^\uFEFF/, '').replace(/\u00A0/g, ' ');
        const lines = cleanCsvData.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        if (lines.length < 1) {
            return NextResponse.json({ data: [] });
        }

        // Find the header row (sometimes it's not the first line)
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
            console.error('[API] Could not find header row in CSV. First 2 lines:', lines.slice(0, 2));
            return NextResponse.json({ error: `Required report columns not found. Check if the report is empty or permissions are sufficient.` }, { status: 500 });
        }

        // Search using aggressive case-insensitive approach (ignores spaces/hidden chars)
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const findHeader = (pattern: string) => headers.findIndex(h => normalize(h).includes(normalize(pattern)));
        
        const siteUrlIdx = findHeader('Site URL');
        const userPrincipalIdx = findHeader('User Principal Name');
        const ownerIdx = findHeader('Owner Display Name');
        const deletedFileCountIdx = findHeader('Deleted File Count');
        const deletedFileSizeIdx = findHeader('Deleted File Size');
        const lastActivityIdx = findHeader('Last Activity Date');

        // FALLBACK: If columns are missing, use Mock Data but log the issue
        if (siteUrlIdx === -1 || (deletedFileCountIdx === -1 && findHeader('File Count') === -1)) {
            console.warn('[API] Required columns missing, falling back to mock data for demonstration.');
            const mockData = generateMockData();
            return NextResponse.json({
                data: mockData,
                totalDeletedCount: mockData.reduce((acc, curr) => acc + curr.deletedFileCount, 0),
                totalDeletedSize: mockData.reduce((acc, curr) => acc + curr.deletedFileSize, 0),
                isMock: true,
                message: "Using demonstration data: The requested Graph report columns were not available in this tenant."
            });
        }

        const reportData = lines.slice(headerRowIdx + 1)
            .map(line => {
                const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
                const siteUrl = values[siteUrlIdx];
                const owner = values[ownerIdx] || values[userPrincipalIdx] || 'Internal Site';
                
                // Try to find any column that might represent deletions or at least total files
                const deletedCount = parseInt(values[deletedFileCountIdx]) || 0;
                const deletedSize = parseInt(values[deletedFileSizeIdx]) || 0;
                
                return {
                    siteUrl,
                    owner,
                    deletedFileCount: deletedCount,
                    deletedFileSize: deletedSize,
                    lastActivity: values[lastActivityIdx] || 'N/A',
                    isPersonal: siteUrl?.includes('-my.sharepoint.com/personal/')
                };
            })
            // Filter and focus on those with activity
            .filter(item => item.isPersonal)
            .sort((a, b) => b.deletedFileCount - a.deletedFileCount)
            .slice(0, 50);

        return NextResponse.json({
            data: reportData,
            totalDeletedCount: reportData.reduce((acc, curr) => acc + curr.deletedFileCount, 0),
            totalDeletedSize: reportData.reduce((acc, curr) => acc + curr.deletedFileSize, 0)
        });
    } catch (error: any) {
        // ... (catch block)
    }
}

function generateMockData() {
    const users = ['Alex Wilber', 'Adele Vance', 'Megan Bowen', 'Grady Archie', 'Joni Sherman'];
    return users.map((user, i) => ({
        siteUrl: `https://m365x123456-my.sharepoint.com/personal/${user.toLowerCase().replace(' ', '_')}_domain_com`,
        owner: user,
        deletedFileCount: Math.floor(Math.random() * 50) + 10,
        deletedFileSize: Math.floor(Math.random() * 500000000) + 100000000,
        lastActivity: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        isPersonal: true
    }));
}
