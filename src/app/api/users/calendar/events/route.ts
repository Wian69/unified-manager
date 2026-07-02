import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const startParam = searchParams.get('startDate');
        const endParam = searchParams.get('endDate');

        if (!userId) {
            return NextResponse.json({ error: "Missing required parameter: userId" }, { status: 400 });
        }

        const client = getGraphClient();

        // Use provided dates or default to current month
        let startDateTime, endDateTime;

        if (startParam && endParam) {
            startDateTime = startParam;
            endDateTime = endParam;
        } else {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            startDateTime = firstDay.toISOString();
            endDateTime = lastDay.toISOString();
        }

        // Fetch calendar events using calendarView which expands recurring meetings
        const response = await client.api(`/users/${userId}/calendarView`)
            .query({
                startDateTime: startDateTime,
                endDateTime: endDateTime
            })
            .select('subject,start,end,isAllDay,location,attendees,isOnlineMeeting,onlineMeeting')
            .orderby('start/dateTime')
            .top(200) // Increase limit for an entire month
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
