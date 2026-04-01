import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { userIds } = await request.json();
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: "Invalid userIds" }, { status: 400 });
        }

        const client = getGraphClient();
        
        // Graph API $batch supports up to 20 requests per call
        const batchSize = 20;
        const statusMap: Record<string, any> = {};

        for (let i = 0; i < userIds.length; i += batchSize) {
            const chunk = userIds.slice(i, i + batchSize);
            const requests = chunk.map((id, index) => ({
                id: (i + index).toString(),
                method: 'GET',
                url: `/users/${id}/mailboxSettings`
            }));

            const response = await client.api('/$batch').post({ requests });
            
            response.responses.forEach((res: any) => {
                const userId = chunk[parseInt(res.id) - i];
                if (res.status === 200) {
                    statusMap[userId] = res.body?.automaticRepliesSetting?.status || 'disabled';
                } else {
                    statusMap[userId] = 'unknown';
                }
            });
        }

        return NextResponse.json({ statusMap });
    } catch (error: any) {
        console.error('[API] Batch OOO Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch batch OOO status", details: error.message },
            { status: 500 }
        );
    }
}
