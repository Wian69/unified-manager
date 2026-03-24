import { execSync } from 'child_process';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    const diagnostic: any = {};
    try {
        const formData = await request.formData();
        const action = formData.get('action') as string;
        const userName = formData.get('userName') as string;

        if (!userName) {
            return NextResponse.json({ error: "Missing user name" }, { status: 400 });
        }

        // Target Base Path
        const baseDir = `C:\\!Data\\Equinox Outsourced Services\\EQNCS Homepage - Information Technology\\Policies\\Exit interview policies`;
        
        // Sanitize User Name for Folder
        const sanitizedUserName = userName.replace(/[^a-z0-9\s.-]/gi, '_').trim();
        // Force Win32 paths to avoid mixed slashes appearing in some environments
        const targetDir = path.win32.normalize(path.win32.join(baseDir, sanitizedUserName));

        // Deep Path Check
        const segments = targetDir.split(path.win32.sep);
        let checkPath = '';
        const pathDiagnostics: any[] = [];
        for (const seg of segments) {
            if (!seg && !checkPath) {
                if (targetDir.startsWith('\\\\')) { // UNC path start
                   checkPath = '\\\\' + segments[2]; // Simplified UNC base
                   continue;
                }
                continue;
            }
            if (!checkPath && seg.includes(':')) { // Drive letter start
                checkPath = seg + path.win32.sep;
                pathDiagnostics.push({ segment: seg, fullPath: checkPath, exists: fs.existsSync(checkPath) });
                continue;
            }
            checkPath = path.win32.join(checkPath, seg);
            try {
                pathDiagnostics.push({
                    segment: seg,
                    fullPath: checkPath,
                    exists: fs.existsSync(checkPath)
                });
            } catch (e) {
                pathDiagnostics.push({
                    segment: seg,
                    fullPath: checkPath,
                    error: (e as any).message
                });
            }
        }

        diagnostic.platform = process.platform;
        diagnostic.targetDir = targetDir;
        diagnostic.pathSegments = pathDiagnostics;
        diagnostic.cwd = process.cwd();

        // ACTION: CREATE FOLDER
        if (action === 'create-folder') {
            try {
                if (!fs.existsSync(targetDir)) {
                    // Use PowerShell to create directory - more robust for synced SharePoint volumes
                    const psCommand = `powershell -Command "New-Item -ItemType Directory -Path '${targetDir}' -Force"`;
                    diagnostic.command = psCommand;
                    const output = execSync(psCommand, { encoding: 'utf8' });
                    diagnostic.psOutput = output;

                    return NextResponse.json({ 
                        success: true, 
                        message: "Folder prepared successfully via shells",
                        path: targetDir,
                        diagnostic
                    });
                } else {
                    return NextResponse.json({ 
                        success: true, 
                        message: "Folder already exists",
                        path: targetDir 
                    });
                }
            } catch (mkdirErr: any) {
                console.error('[MKDIR] Error:', mkdirErr);
                return NextResponse.json({ 
                    error: "Failed to create directory", 
                    details: mkdirErr.message,
                    stdout: mkdirErr.stdout,
                    stderr: mkdirErr.stderr,
                    diagnostic 
                }, { status: 500 });
            }
        }

        // ACTION: UPLOAD FILES
        if (action === 'upload') {
            const policyFile = formData.get('policyFile') as File | null;
            const checklistFile = formData.get('checklistFile') as File | null;

            if (!policyFile || !checklistFile) {
                return NextResponse.json({ error: "Both Policy and Checklist files are required" }, { status: 400 });
            }

            if (!fs.existsSync(targetDir)) {
                return NextResponse.json({ 
                    error: "Target folder does not exist. Please prepare folder first.",
                    diagnostic 
                }, { status: 400 });
            }

            const dateStr = new Date().toISOString().split('T')[0];
            
            // Helper to save file
            const saveFile = async (file: File, prefix: string) => {
                const ext = path.extname(file.name) || ".pdf";
                const customName = `${prefix} [${dateStr}]${ext}`;
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const filePath = path.win32.join(targetDir, customName);
                fs.writeFileSync(filePath, buffer);
                return customName;
            };

            const policyName = await saveFile(policyFile, "EQN IT Exit Policy");
            const checklistName = await saveFile(checklistFile, "EQN IT Exit Checklist");

            return NextResponse.json({ 
                success: true, 
                message: "Documents archived successfully",
                files: [policyName, checklistName]
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

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
