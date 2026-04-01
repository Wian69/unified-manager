import { ClientSecretCredential } from '@azure/identity';
import fs from 'fs';

// Manual env loading
if (fs.existsSync('.env.local')) {
    const env = fs.readFileSync('.env.local', 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            process.env[key] = value;
        }
    });
}

const DATAVERSE_URL = 'https://eqnoutsourcedservicessaptyltddef.api.crm4.dynamics.com';

async function diagnoseWorkflows() {
    try {
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        const tokenRes = await credential.getToken(`${DATAVERSE_URL}/.default`);
        const token = tokenRes.token;

        console.log('Querying ALL workflows (top 50)...');
        // Removing many filters to see what's there
        const url = `${DATAVERSE_URL}/api/data/v9.2/workflows?$select=name,category,statecode,statuscode,type,solutionid,componentstate&$top=50`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        const data = await res.json();
        
        if (res.ok) {
            console.log('Total found:', data.value?.length);
            data.value?.forEach((f: any) => {
                console.log(`- Name: ${f.name}`);
                console.log(`  Category: ${f.category} (5=Flow, 3=Action, 1=Workflow)`);
                console.log(`  State: ${f.statecode}, Status: ${f.statuscode}`);
                console.log(`  Type: ${f.type}`);
                console.log('-------------------');
            });
        } else {
            console.log('Error:', JSON.stringify(data, null, 2));
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

diagnoseWorkflows();
