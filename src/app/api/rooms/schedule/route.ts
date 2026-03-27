import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { roomEmails, startDate, endDate } = await request.json();
        
        if (!roomEmails || !Array.isArray(roomEmails)) {
            return NextResponse.json({ error: "Missing or invalid roomEmails" }, { status: 400 });
        }

        const client = getGraphClient();
        
        // Use provided dates or fallback to today
        const start = startDate ? new Date(startDate) : new Date();
        if (!startDate) start.setHours(0, 0, 0, 0);
        
        const end = endDate ? new Date(endDate) : new Date();
        if (!endDate) end.setHours(23, 59, 59, 999);

        // Fetch individual schedules in parallel using Application permissions
        // getSchedule on /me is only for Delegated auth. For App auth, we query room calendars directly.
        console.log(`[API] Querying ${roomEmails.length} calendars directly...`);
        
        const schedulePromises = roomEmails.map(async (email) => {
            try {
                const calView = await client.api(`/users/${email}/calendar/calendarView`)
                    .query({
                        startDateTime: start.toISOString(),
                        endDateTime: end.toISOString()
                    })
                    .select('subject,start,end,organizer,attendees,bodyPreview,location')
                    .get();
                
                return {
                    scheduleId: email,
                    scheduleItems: calView.value.map((item: any) => ({
                        subject: item.subject,
                        start: item.start,
                        end: item.end,
                        organizer: item.organizer?.emailAddress?.displayName || item.organizer?.emailAddress?.address || "Internal Meeting",
                        organizerEmail: item.organizer?.emailAddress?.address,
                        attendees: item.attendees?.map((a: any) => ({
                            name: a.emailAddress?.displayName || a.emailAddress?.address,
                            type: a.type
                        })) || [],
                        description: item.bodyPreview,
                        location: item.location?.displayName
                    }))
                };
            } catch (err: any) {
                console.warn(`[API] Failed to fetch for ${email}:`, err.message);
                return { scheduleId: email, scheduleItems: [], error: err.message };
            }
        });

        const results = await Promise.all(schedulePromises);

        return NextResponse.json({
            data: results,
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
