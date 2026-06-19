import * as fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
    }
});
import { getGraphClient } from './src/lib/graph';

async function main() {
    try {
        const client = getGraphClient();
        
        console.log("Creating Winget Auto-Upgrade 9AM Remediation...");

        const detectionScript = `
$Updates = winget upgrade --include-unknown | Out-String
if ($Updates -like "*total updates available*") { exit 1 } else { exit 0 }
`.trim();

        const remediationScript = `
Write-Host "Starting 9AM SAST Daily Upgrade..."
winget upgrade --all --silent --accept-package-agreements --accept-source-agreements --include-unknown
`.trim();

        const payload = {
            displayName: "Winget Auto-Upgrade 9AM",
            description: "Daily automated software patching at 9am SAST. Fixes vulnerabilities fleet-wide.",
            detectionScriptContent: Buffer.from(detectionScript).toString('base64'),
            remediationScriptContent: Buffer.from(remediationScript).toString('base64'),
            runAsAccount: "system"
        };

        const res = await client.api('/deviceManagement/deviceHealthScripts').version('beta').post(payload);
        const scriptId = res.id;
        console.log("Successfully created script! ID:", scriptId);

        console.log("Assigning with Daily 09:00 SAST schedule...");
        const assignment = {
            "target": { "@odata.type": "#microsoft.graph.allDevicesAssignmentTarget" },
            "runSchedule": {
                "@odata.type": "#microsoft.graph.deviceHealthScriptDailySchedule",
                "interval": 1,
                "time": "07:00:00" // 07:00 UTC = 09:00 SAST
            }
        };

        await client.api(`/deviceManagement/deviceHealthScripts/${scriptId}/assign`)
            .version('beta')
            .post({ deviceHealthScriptAssignments: [assignment] });

        console.log("Full Deployment Complete!");

    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

main().then(() => console.log("Done")).catch(console.error);
