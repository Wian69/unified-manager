import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userName = formData.get('userName') as string;

        if (!file || !userName) {
            return NextResponse.json({ error: "Missing file or user name" }, { status: 400 });
        }

        // Target Base Path (Explicit Windows backslashes)
        const baseDir = `C:\\!Data\\Equinox Outsourced Services\\EQNCS Homepage - Information Technology\\Policies\\Exit interview policies`;
        
        // Sanitize User Name for Folder
        const sanitizedUserName = userName.replace(/[^a-z0-9\s.-]/gi, '_').trim();
        
        // Use path.win32 to ensure Windows style separators if on a Windows machine
        const targetDir = path.win32.join(baseDir, sanitizedUserName);

        console.log(`[UPLOAD] Base Directory detected: ${fs.existsSync(baseDir)}`);
        console.log(`[UPLOAD] Target Directory will be: ${targetDir}`);

        // Ensure directories exist
        if (!fs.existsSync(targetDir)) {
            console.log(`[UPLOAD] Creating directory: ${targetDir}`);
            try {
                fs.mkdirSync(targetDir, { recursive: true });
            } catch (err: any) {
                console.error(`[UPLOAD] mkdirSync failed: ${err.message}`);
                // Try one more time with a slightly different approach if recursive fails
                if (!fs.existsSync(targetDir)) {
                    throw err;
                }
            }
        }

        // Generate custom file name: EQN Exit IT [date].pdf (sanitizing date part)
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const extension = path.extname(file.name) || ".pdf";
        const customName = `EQN Exit IT [${dateStr}]${extension}`;
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filePath = path.win32.join(targetDir, customName);
        console.log(`[UPLOAD] Saving file to: ${filePath}`);
        
        fs.writeFileSync(filePath, buffer);

        return NextResponse.json({ 
            success: true, 
            message: `Archived as: ${customName}`,
            path: filePath
        });

    } catch (error: any) {
        console.error('[UPLOAD] Fatal Error:', error);
        return NextResponse.json(
            { error: "Archival System Error", details: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}
