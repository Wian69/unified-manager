import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

const CONFIG_PATH = '/sites/root/drive/root:/_Config/signatures.json';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Attempt to fetch the configuration file from SharePoint
        try {
            const fileResponse = await client.api(CONFIG_PATH).content().get();
            // Graph content() returns a readable stream or buffer. 
            // In Next.js/Node environment, we'll convert it to a string.
            let content = '';
            if (typeof fileResponse.text === 'function') {
                content = await fileResponse.text();
            } else {
                // If it's a buffer or similar
                content = fileResponse.toString();
            }
            
            return NextResponse.json(JSON.parse(content));
        } catch (fileError: any) {
            // If file doesn't exist, return null
            if (fileError.code === 'itemNotFound') {
                return NextResponse.json({ signature: null });
            }
            throw fileError;
        }
    } catch (error: any) {
        console.error('[API] Signature Load Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { html, name, selectedUserIds } = body;
        const client = getGraphClient();

        const data = {
            html,
            name,
            selectedUserIds,
            updatedAt: new Date().toISOString()
        };

        // Upload the JSON configuration to SharePoint
        // Using PUT with .content() to create or update the file
        await client.api(CONFIG_PATH)
            .content()
            .put(JSON.stringify(data, null, 2));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] Signature Save Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
