import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

const CONFIG_PATH = '/sites/root/drive/root:/_Config/signatures.json';
const CONTENT_PATH = `${CONFIG_PATH}:/content`;

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Attempt to fetch the configuration file from SharePoint
        try {
            const fileResponse = await client.api(CONTENT_PATH).get();
            // In Node.js/Graph SDK environment, file content response is usually a buffer or stream
            let content = '';
            
            if (fileResponse instanceof Buffer) {
                content = fileResponse.toString('utf8');
            } else if (typeof fileResponse.text === 'function') {
                content = await fileResponse.text();
            } else if (typeof fileResponse === 'string') {
                content = fileResponse;
            } else {
                // Handle as object if already parsed or stream
                content = JSON.stringify(fileResponse);
            }
            
            return NextResponse.json(JSON.parse(content));
        } catch (fileError: any) {
            // If file doesn't exist, return null
            if (fileError.code === 'itemNotFound' || fileError.status === 404) {
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
        // Using PUT on the content path to create or update the file
        await client.api(CONTENT_PATH)
            .put(JSON.stringify(data, null, 2));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] Signature Save Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
