import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: "Missing required parameter: userId" }, { status: 400 });
        }

        const client = getGraphClient();

        // Calculate today and 7 days from now for the calendar view window
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const startDateTime = now.toISOString();
        const endDateTime = nextWeek.toISOString();

        // Fetch calendar events using calendarView which expands recurring meetings
        const response = await client.api(`/users/${userId}/calendarView`)
            .query({
                startDateTime: startDateTime,
                endDateTime: endDateTime
            })
            .select('subject,start,end,isAllDay,location,attendees,isOnlineMeeting,onlineMeeting')
            .orderby('start/dateTime')
            .top(20) // Limit to next 20 events
            .get();

        return NextResponse.json({ 
            success: true, 
            events: response.value || [] 
        });
    } catch (error: any) {
        console.error("[Calendar Viewer] Error fetching events:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch calendar events" }, { status: 500 });
    }
}
