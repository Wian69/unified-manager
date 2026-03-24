import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    const diagnostic: any = {};
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userName = formData.get('userName') as string;

        if (!file || !userName) {
            return NextResponse.json({ error: "Missing file or user name" }, { status: 400 });
        }

        // Target Base Path
        const baseDir = `C:\\!Data\\Equinox Outsourced Services\\EQNCS Homepage - Information Technology\\Policies\\Exit interview policies`;
        diagnostic.baseDir = baseDir;
        diagnostic.baseDirExists = fs.existsSync(baseDir);

        // Sanitize User Name for Folder
        const sanitizedUserName = userName.replace(/[^a-z0-9\s.-]/gi, '_').trim();
        diagnostic.userName = userName;
        diagnostic.sanitizedUserName = sanitizedUserName;

        // Path Construction
        const targetDir = path.join(baseDir, sanitizedUserName);
        diagnostic.targetDir = targetDir;

        // Ensure directories exist
        if (!fs.existsSync(targetDir)) {
            console.log(`[UPLOAD] Attempting to create: ${targetDir}`);
            // Manual check of parent
            if (!fs.existsSync(baseDir)) {
                console.error(`[UPLOAD] BASE DIRECTORY NOT FOUND BY NODE: ${baseDir}`);
                // Try to find where it breaks
                const parts = baseDir.split(path.sep);
                let current = "";
                for(const part of parts) {
                    current = current ? path.join(current, part) : part;
                    if (!fs.existsSync(current)) {
                        diagnostic.breakPath = current;
                        break;
                    }
                }
                throw new Error(`Base directory path component missing: ${diagnostic.breakPath || baseDir}`);
            }
            
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Generate custom file name
        const dateStr = new Date().toISOString().split('T')[0];
        const extension = path.extname(file.name) || ".pdf";
        const customName = `EQN Exit IT [${dateStr}]${extension}`;
        diagnostic.fileName = customName;
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filePath = path.join(targetDir, customName);
        diagnostic.filePath = filePath;

        fs.writeFileSync(filePath, buffer);

        return NextResponse.json({ 
            success: true, 
            message: `Archived as: ${customName}`,
            path: filePath
        });

    } catch (error: any) {
        console.error('[UPLOAD] Fatal Error:', error);
        return NextResponse.json(
            { 
                error: "Archival System Error", 
                details: error.message, 
                diagnostic 
            },
            { status: 500 }
        );
    }
}
