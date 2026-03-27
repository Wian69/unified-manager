import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch all meeting rooms
        // Note: Requires Place.Read.All
        const response = await client.api('/places/microsoft.graph.room')
            .select('id,displayName,emailAddress,capacity,building,floorNumber')
            .get();

        let rooms = response.value || [];

        // 2. If no rooms found via Places API, try searching for Resource-type mailboxes
        if (rooms.length === 0) {
            console.log('[API] No rooms via Places API, trying Users filter...');
            const resourceResponse = await client.api('/users')
                .filter("userType eq 'Resource' or contains(displayName, 'Room')")
                .select('id,displayName,userPrincipalName')
                .get();
            
            rooms = (resourceResponse.value || []).map((u: any) => ({
                id: u.id,
                displayName: u.displayName,
                emailAddress: u.userPrincipalName,
                capacity: 10, // Default for placeholders
                floorNumber: 1
            }));
        }

        return NextResponse.json({
            data: rooms,
            count: rooms.length,
            source: rooms.length > response.value?.length ? 'directory-search' : 'places-api'
        });

    } catch (error: any) {
        console.error('[API] Rooms Fetch Error:', error.message);
        
        // Final fallback only if everything fails
        return NextResponse.json(
            { error: "Failed to fetch meeting rooms", details: error.message },
            { status: 500 }
        );
    }
}
