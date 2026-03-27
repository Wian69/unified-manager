import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { roomEmails } = await request.json();
        
        if (!roomEmails || !Array.isArray(roomEmails)) {
            return NextResponse.json({ error: "Missing or invalid roomEmails" }, { status: 400 });
        }

        const client = getGraphClient();
        
        // Define time window (24 hours from start of day)
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        // Fetch Schedule
        // Requires Calendars.Read.Shared or Calendars.Read
        console.log(`[API] Fetching schedule for ${roomEmails.length} rooms...`);
        const response = await client.api('/me/calendar/getSchedule')
            .header('Prefer', 'outlook.timezone="UTC"') // Force UTC for consistent parsing
            .post({
                schedules: roomEmails,
                startTime: {
                    dateTime: start.toISOString(),
                    timeZone: 'UTC'
                },
                endTime: {
                    dateTime: end.toISOString(),
                    timeZone: 'UTC'
                },
                availabilityViewInterval: 60
            });

        return NextResponse.json({
            data: response.value || [],
            timestamp: new Date().toISOString(),
            success: true
        });

    } catch (error: any) {
        console.error('[API] Schedule Fetch Error:', error.message);
        return NextResponse.json({
            error: error.message,
            statusCode: error.statusCode || 500,
            success: false,
            tip: "Requires Calendars.Read.Shared permissions."
        });
    }
}
