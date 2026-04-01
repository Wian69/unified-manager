import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const userName = formData.get('userName') as string;
        const file = formData.get('file') as File;

        if (!userName || !file) {
            return NextResponse.json({ error: "Missing userName or file" }, { status: 400 });
        }

        const client = getGraphClient();
        
        // SharePoint Target IDs (EQNCS Root Drive)
        const DRIVE_ID = 'b!u2HqXRRUuU6JJE53zmMgmYbUu55OpG1HkiV4ZflxRZqZIVNCDxskQbXbEvQPTOVq';
        
        // Target Path: /Information Technology/Checklists
        // We'll resolve the folder ID by path first
        let folderId = "";
        try {
            const folderRes = await client.api(`/drives/${DRIVE_ID}/root:/Information Technology/Checklists`).get();
            folderId = folderRes.id;
        } catch (err: any) {
            console.error('[ARCHIVE] Folder resolution failed. attempting to create...', err.message);
            // Fallback: If it doesn't exist, this might fail or we could try to create it.
            // For production safety, we assume IT pre-created the 'Information Technology/Checklists' structure.
            return NextResponse.json({ 
                error: "Target SharePoint folder not found", 
                details: "Please ensure '/Information Technology/Checklists' exists in Shared Documents." 
            }, { status: 404 });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        // Filename: EQN {username} {date}.pdf (Removed "and" as per User Request)
        const fileName = `EQN ${userName} ${dateStr}.pdf`;
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        console.log(`[ARCHIVE] Uploading ${fileName} to SharePoint folder ${folderId}`);
        
        // Upload to folder by ID + custom filename
        const uploadResult = await client.api(`/drives/${DRIVE_ID}/items/${folderId}:/${fileName}:/content`)
            .put(buffer);

        return NextResponse.json({ 
            success: true, 
            message: "Checklist archived to SharePoint",
            fileName,
            webUrl: uploadResult.webUrl 
        }, { status: 200 });

    } catch (error: any) {
        console.error('[ARCHIVE] Fatal Error:', error.message);
        return NextResponse.json(
            { error: "Failed to archive to SharePoint", details: error.body || error.message },
            { status: 500 }
        );
    }
}
