import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    try {
        const client = getGraphClient();

        // 1. Fetch User Presence
        const presence = await client.api(`/users/${userId}/presence`).get();

        const isInMeeting = presence.activity === 'InAMeeting' || presence.activity === 'Presenting';
        let meetingDetails = null;

        // 2. If in a meeting, try to fetch current calendar event for attendee info
        if (isInMeeting) {
            const now = new Date();
            const start = now.toISOString();
            const end = new Date(now.getTime() + 60 * 1000).toISOString(); // 1 minute window

            try {
                const calendarView = await client.api(`/users/${userId}/calendar/calendarView`)
                    .query({
                        startDateTime: start,
                        endDateTime: end
                    })
                    .select('id,subject,attendees,isOnlineMeeting,onlineMeetingUrl,organizer')
                    .get();

                if (calendarView.value && calendarView.value.length > 0) {
                    // Get the primary current event
                    const event = calendarView.value[0];
                    meetingDetails = {
                        subject: event.subject,
                        organizer: event.organizer?.emailAddress?.displayName || "Unknown Organizer",
                        attendees: event.attendees?.map((a: any) => ({
                            name: a.emailAddress?.displayName,
                            email: a.emailAddress?.address,
                            type: a.type
                        })) || [],
                        isOnline: event.isOnlineMeeting
                    };
                }
            } catch (calErr: any) {
                console.warn('[Presence API] Calendar fetch failed:', calErr.message);
            }
        }

        return NextResponse.json({
            presence,
            meeting: meetingDetails,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[API] Presence Audit Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch presence audit", details: error.message },
            { status: 500 }
        );
    }
}
