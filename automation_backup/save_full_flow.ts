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
const FLOW_ID = '38f38ed8-472d-ef11-840a-000d3abfe99d'; // From previous output

async function saveFullFlowDefinition() {
    try {
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        const tokenRes = await credential.getToken(`${DATAVERSE_URL}/.default`);
        const token = tokenRes.token;

        console.log(`Fetching full definition for flow ${FLOW_ID}...`);
        const url = `${DATAVERSE_URL}/api/data/v9.2/workflows(${FLOW_ID})?$select=clientdata`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        if (data.clientdata) {
            fs.writeFileSync('notification_flow_definition.json', data.clientdata);
            console.log('Full definition saved to notification_flow_definition.json');
        } else {
            console.log('No clientdata found for this flow.');
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

saveFullFlowDefinition();
