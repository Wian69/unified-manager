import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch SharePoint site usage report for the last 30 days
        // This report typically returns CSV content
        const response = await client.api('/reports/getSharePointSiteUsageDetail(period=\'D30\')')
            .get();

        if (typeof response !== 'string') {
            console.error('[API] Unexpected response format from Graph Reports:', response);
            return NextResponse.json({ error: "Unexpected response format from Microsoft Graph" }, { status: 500 });
        }

        // Parse CSV
        const lines = response.split('\n');
        if (lines.length < 2) {
            return NextResponse.json({ data: [] });
        }

        const headers = lines[0].split(',');
        const siteUrlIdx = headers.indexOf('Site URL');
        const ownerIdx = headers.indexOf('Owner Display Name');
        const deletedFileCountIdx = headers.indexOf('Deleted File Count');
        const deletedFileSizeIdx = headers.indexOf('Deleted File Size (Byte)');
        const lastActivityIdx = headers.indexOf('Last Activity Date');

        if (siteUrlIdx === -1 || deletedFileCountIdx === -1) {
            console.error('[API] Required headers not found in CSV:', headers);
            return NextResponse.json({ error: "Required report columns not found" }, { status: 500 });
        }

        const reportData = lines.slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
                const values = line.split(',');
                return {
                    siteUrl: values[siteUrlIdx],
                    owner: values[ownerIdx],
                    deletedFileCount: parseInt(values[deletedFileCountIdx]) || 0,
                    deletedFileSize: parseInt(values[deletedFileSizeIdx]) || 0,
                    lastActivity: values[lastActivityIdx],
                    isPersonal: values[siteUrlIdx]?.includes('-my.sharepoint.com/personal/')
                };
            })
            // Filter for personal sites and focus on those with deletions
            .filter(item => item.isPersonal && item.deletedFileCount > 0)
            // Sort by deletion volume (count)
            .sort((a, b) => b.deletedFileCount - a.deletedFileCount)
            .slice(0, 50);

        return NextResponse.json({
            data: reportData,
            totalDeletedCount: reportData.reduce((acc, curr) => acc + curr.deletedFileCount, 0),
            totalDeletedSize: reportData.reduce((acc, curr) => acc + curr.deletedFileSize, 0)
        });
    } catch (error: any) {
        console.error('[API] Graph API Error (SharePoint Deletions):', error.message);
        
        if (error.message?.includes('S2SUnauthorized') || error.message?.includes('Invalid permission')) {
            return NextResponse.json(
                { error: "Access Denied: The application requires 'Reports.Read.All' permission in Azure AD to access usage data." },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: "Failed to fetch SharePoint deletion data", details: error.message },
            { status: 500 }
        );
    }
}
