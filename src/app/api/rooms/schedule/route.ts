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
        
        // Define time window (Today, 8:00 AM to 6:00 PM)
        const start = new Date();
        start.setHours(8, 0, 0, 0);
        
        const end = new Date();
        end.setHours(18, 0, 0, 0);

        // Fetch Schedule
        // Requires Calendars.Read.Shared or Calendars.Read
        const response = await client.api('/me/calendar/getSchedule')
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
                availabilityViewInterval: 60 // 1 hour slots for simplified vista
            });

        return NextResponse.json({
            data: response.value || [],
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[API] Schedule Fetch Error:', error.message);
        
        // Fallback for demo
        const { roomEmails } = await request.json().catch(() => ({ roomEmails: [] }));
        return NextResponse.json({
            data: roomEmails.map((email: string) => ({
                scheduleId: email,
                availabilityView: "00000111000", // Busy from 1PM to 4PM (simplified)
                scheduleItems: [
                    {
                        start: { dateTime: new Date().toISOString().split('T')[0] + 'T13:00:00Z' },
                        end: { dateTime: new Date().toISOString().split('T')[0] + 'T16:00:00Z' },
                        status: 'busy',
                        subject: 'Strategic Planning',
                        organizer: 'Wian Du Randt'
                    }
                ]
            })),
            isFallback: true
        });
    }
}
