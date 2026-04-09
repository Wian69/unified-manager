import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const client = getGraphClient();

        // 1. Fetch Group Memberships (Transitive)
        // We use transitiveMemberOf to catch groups the user is in via nesting
        const groupsResponse = await client.api(`/users/${id}/transitiveMemberOf`)
            .select('id,displayName,description,mail,groupTypes,securityEnabled')
            .top(999)
            .get();

        const groups = groupsResponse.value || [];

        // 2. Fetch Shared Items (OneDrive / SharePoint)
        let sharedItems = [];
        try {
            const sharedRes = await client.api(`/users/${id}/drive/sharedWithMe`).get();
            sharedItems = sharedRes.value || [];
        } catch (e) {
            console.warn(`[API] Could not fetch shared items for ${id}:`, e);
        }

        return NextResponse.json({
            success: true,
            groups,
            sharedItems
        });
    } catch (error: any) {
        console.error('[API] Memberships Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch memberships", details: error.message },
            { status: 500 }
        );
    }
}
