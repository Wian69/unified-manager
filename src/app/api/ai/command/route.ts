import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { command } = await req.json();

        if (!command) {
            return NextResponse.json({ error: "No command provided" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
            You are an AI assistant for a IT Device Management Dashboard called "Unified Manager".
            The user provides a voice command in natural language.
            Your job is to interpret the intent and return a JSON object with the action to take.

            Available routes/pages:
            - / : Dashboard (Summary, Recent Activity)
            - /devices : Device Inventory
            - /offboarding : Employee Offboarding
            - /users : User Management
            - /sharepoint : File Archival / SharePoint
            - /rooms : Meeting Room Calendar
            - /settings : System Settings

            Available actions:
            1. NAVIGATE: { "action": "NAVIGATE", "target": "/path" }
            2. SEARCH: { "action": "SEARCH", "target": "/path", "query": "search term" }
            3. INFO: { "action": "INFO", "text": "A brief summary or answer" }

            User Command: "${command}"

            Rules:
            - Return ONLY valid JSON.
            - If it's a general question about the system, use INFO.
            - If it's a navigation request, use NAVIGATE.
            - If it mentions a specific device, user, or file, use SEARCH in the relevant section.
            - Be helpful and concise.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean up response text in case it has markdown blocks
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonAction = JSON.parse(jsonMatch[0]);
            return NextResponse.json(jsonAction);
        }

        return NextResponse.json({ action: "INFO", text: responseText });
    } catch (error: any) {
        console.error("AI Command Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
