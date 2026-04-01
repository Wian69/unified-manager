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

async function verifySpecificFlows() {
    try {
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        const tokenRes = await credential.getToken(`${DATAVERSE_URL}/.default`);
        const token = tokenRes.token;

        console.log('Searching for specific flows by name...');
        const names = [
            'Leaver Form',
            'External User folders permission',
            'Notification Completed and details for Partner and EQ...',
            'E Card'
        ];

        for (const name of names) {
            const url = `${DATAVERSE_URL}/api/data/v9.2/workflows?$filter=name eq '${name}'&$select=name,category,workflowid,statecode`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            
            if (data.value && data.value.length > 0) {
                console.log(`FOUND: ${name}`);
                console.log(JSON.stringify(data.value[0], null, 2));
            } else {
                console.log(`NOT FOUND: ${name}`);
            }
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

verifySpecificFlows();
