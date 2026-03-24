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

        // Target Base Path
        const baseDir = `C:\\!Data\\Equinox Outsourced Services\\EQNCS Homepage - Information Technology\\Policies\\Exit interview policies`;
        
        // Sanitize User Name for Folder
        const sanitizedUserName = userName.replace(/[^a-z0-9\s-]/gi, '_').trim();
        const targetDir = path.join(baseDir, sanitizedUserName);

        // Ensure directories exist
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filePath = path.join(targetDir, file.name);
        fs.writeFileSync(filePath, buffer);

        console.log(`[UPLOAD] File saved to: ${filePath}`);

        return NextResponse.json({ 
            success: true, 
            message: "File archived successfully",
            path: filePath
        });

    } catch (error: any) {
        console.error('[UPLOAD] Error:', error.message);
        return NextResponse.json(
            { error: "Failed to archive document", details: error.message },
            { status: 500 }
        );
    }
}
