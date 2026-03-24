import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';
import { getWatchlist, saveWatchlist } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const action = formData.get('action') as string;
        const userName = formData.get('userName') as string;

        if (!userName) {
            return NextResponse.json({ error: "Missing user name" }, { status: 400 });
        }

        const client = getGraphClient();
        
        // SharePoint Target IDs (EQNCS Homepage -> Policies -> Exit interview policies)
        const SITE_ID = 'xxeqncs.sharepoint.com,5dea61bb-5414-4eb9-8924-4db325049cf1,2e3e1f50-85e9-4e47-a44e-476d92257865';
        const DRIVE_ID = 'b!u2HqXRRUuU6JJE53zmMgmYbUu55OpG1HkiV4ZflxRZqZIVNCDxskQbXbEvQPTOVq';
        const BASE_FOLDER_ID = '01KVNKAHXZXJ5IB2PRBJHZLOIEXBU5A4O3';

        // Sanitize User Name for Folder
        const sanitizedUserName = userName.replace(/[^a-z0-9\s.-]/gi, '_').trim();
        const userFolderRequestPath = `/drives/${DRIVE_ID}/items/${BASE_FOLDER_ID}:/${sanitizedUserName}`;

        // ACTION: CREATE FOLDER
        if (action === 'create-folder') {
            try {
                // Check if user folder exists
                try {
                    await client.api(userFolderRequestPath).get();
                    return NextResponse.json({ 
                        success: true, 
                        message: "SharePoint folder already exists",
                        path: sanitizedUserName 
                     });
                } catch (e: any) {
                    if (e.code === 'itemNotFound') {
                        // Create it
                        await client.api(`/drives/${DRIVE_ID}/items/${BASE_FOLDER_ID}/children`).post({
                            name: sanitizedUserName,
                            folder: {},
                            "@microsoft.graph.conflictBehavior": "fail"
                        });
                        return NextResponse.json({ 
                            success: true, 
                            message: "SharePoint archival folder created",
                            path: sanitizedUserName 
                        });
                    }
                    throw e;
                }
            } catch (err: any) {
                console.error('[SHAREPOINT] Folder Error:', err.message);
                return NextResponse.json({ error: "Failed to prepare SharePoint folder", details: err.message }, { status: 500 });
            }
        }

        // ACTION: UPLOAD FILES
        if (action === 'upload') {
            const policyFile = formData.get('policyFile') as File | null;
            const checklistFile = formData.get('checklistFile') as File | null;

            if (!policyFile || !checklistFile) {
                return NextResponse.json({ error: "Both Policy and Checklist files are required" }, { status: 400 });
            }

            // --- AUTO-ENSURE FOLDER EXISTS ---
            try {
                try {
                    await client.api(userFolderRequestPath).get();
                } catch (e: any) {
                    if (e.code === 'itemNotFound') {
                        await client.api(`/drives/${DRIVE_ID}/items/${BASE_FOLDER_ID}/children`).post({
                            name: sanitizedUserName,
                            folder: {},
                            "@microsoft.graph.conflictBehavior": "fail"
                        });
                        console.log(`[ARCHIVAL] Created missing folder for ${sanitizedUserName}`);
                    } else {
                        throw e;
                    }
                }
            } catch (folderErr: any) {
                console.error('[SHAREPOINT] Auto-Folder Error:', folderErr.message);
                return NextResponse.json({ error: "Failed to ensure SharePoint folder exists", details: folderErr.message }, { status: 500 });
            }
            // ---------------------------------

            const dateStr = new Date().toISOString().split('T')[0];
            
            // Helper to upload to Graph
            const uploadFile = async (file: File, prefix: string) => {
                const ext = file.name.split('.').pop() || "pdf";
                const customName = `${prefix} [${dateStr}].${ext}`;
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                // Use simple upload for files < 4MB (Standard for these docs)
                await client.api(`${userFolderRequestPath}/${customName}:/content`)
                    .put(buffer);
                
                return customName;
            };

            try {
                const policyName = await uploadFile(policyFile, "EQN IT Exit Policy");
                const checklistName = await uploadFile(checklistFile, "EQN IT Exit Checklist");

                // Update Watchlist Status to "Offboarding Complete"
                try {
                    const watchlist = await getWatchlist();
                    const updatedWatchlist = watchlist.map((u: any) => {
                        if (u.displayName === userName) {
                            return { ...u, status: "Offboarding Complete" };
                        }
                        return u;
                    });
                    await saveWatchlist(updatedWatchlist);
                    console.log(`[ARCHIVAL] Updated status for ${userName} to 'Offboarding Complete'`);
                } catch (dbErr) {
                    console.error('[ARCHIVAL] Failed to update watchlist status:', dbErr);
                    // Don't fail the whole request if only the DB update fails
                }

                return NextResponse.json({ 
                    success: true, 
                    message: "Documents archived to SharePoint successfully",
                    files: [policyName, checklistName]
                });
            } catch (err: any) {
                console.error('[SHAREPOINT] Upload Error:', err.message);
                return NextResponse.json({ error: "Failed to upload to SharePoint", details: err.message }, { status: 500 });
            }
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error('[ARCHIVAL] Fatal Error:', error);
        return NextResponse.json({ error: "Archival System Error", details: error.message }, { status: 500 });
    }
}
