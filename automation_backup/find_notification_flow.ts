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

async function findFlowByFuzzyName() {
    try {
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        const tokenRes = await credential.getToken(`${DATAVERSE_URL}/.default`);
        const token = tokenRes.token;

        console.log('Searching for flows containing "Notification"...');
        const url = `${DATAVERSE_URL}/api/data/v9.2/workflows?$filter=contains(name, 'Notification') and category eq 5&$select=name,category,workflowid,statecode,clientdata`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        const data = await res.json();
        
        if (data.value && data.value.length > 0) {
            data.value.forEach((f: any) => {
                console.log(`\nFOUND: ${f.name}`);
                console.log(`ID: ${f.workflowid}`);
                // Only print part of clientdata to avoid huge output, but check for Form info
                if (f.clientdata) {
                    console.log('ClientData snippet:', f.clientdata.substring(0, 500));
                }
            });
        } else {
            console.log('NOT FOUND: No flow containing "Notification"');
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

findFlowByFuzzyName();
