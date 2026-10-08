import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/msgraph";

const SITE_ID = "xxeqncs.sharepoint.com,21560bf0-53a4-4067-90c0-a711b01ea3f2,b8018860-10c2-49bf-82a7-811de2ce3c3e";
const LIST_ID = "ec7c28b2-d2bc-4d99-8550-499f385fd58d";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const client = getGraphClient();
        
        // Generate a ticket number
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
        const randomId = Math.floor(Math.random() * 900) + 100;
        const ticketNumber = `EQN-${dateStr}-${randomId}`;

        const payload = {
            fields: {
                Title: body.email,
                NameSurname: body.name,
                Region: body.region,
                Department: body.department,
                TechnicalIssue: body.issue,
                TicketNumber: ticketNumber,
                Status: "Incomplete"
            }
        };

        const response = await client.api(`/sites/${SITE_ID}/lists/${LIST_ID}/items`).post(payload);
        
        return NextResponse.json({ success: true, ticketNumber, id: response.id });
    } catch (e: any) {
        console.error("Support API error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
