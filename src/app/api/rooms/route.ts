import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch all meeting rooms
        // Note: Requires Place.Read.All
        const response = await client.api('/places/microsoft.graph.room')
            .select('id,displayName,emailAddress,capacity,building,floorNumber,isWheelChairAccessible')
            .get();

        return NextResponse.json({
            data: response.value || [],
            count: response.value?.length || 0
        });

    } catch (error: any) {
        console.error('[API] Rooms Fetch Error:', error.message);
        
        // Fallback for demo/dev if API fails due to permissions in sandbox
        if (error.statusCode === 403 || error.statusCode === 401) {
             return NextResponse.json({
                 data: [
                     { id: 'room1', displayName: 'Boardroom (Alpha)', emailAddress: 'alpha@example.com', capacity: 20 },
                     { id: 'room2', displayName: 'Focus Room (Beta)', emailAddress: 'beta@example.com', capacity: 4 },
                     { id: 'room3', displayName: 'Innovation Hub', emailAddress: 'hub@example.com', capacity: 12 }
                 ],
                 isFallback: true
             });
        }

        return NextResponse.json(
            { error: "Failed to fetch meeting rooms", details: error.message },
            { status: 500 }
        );
    }
}
