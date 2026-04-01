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

const ENV_ID = 'Default-5d57c9a9-b1b5-4cd2-be8c-14b00490163d';

async function testBapFlows() {
    try {
        console.log('Fetching Management Token for BAP...');
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        const tokenRes = await credential.getToken('https://management.azure.com/.default');
        const token = tokenRes.token;

        console.log('Querying api.bap.microsoft.com (Admin Scope)...');
        // Correct Administrative Path for Service Principals
        const url = `https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/${ENV_ID}/flows?api-version=2021-04-01`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        console.log(`Status: ${res.status}`);
        const body = await res.text();
        
        if (res.ok) {
            const data = JSON.parse(body);
            console.log('Flows found via BAP:', data.value?.length);
            data.value?.slice(0, 5).forEach((flow: any) => {
                console.log(`- ${flow.properties.displayName} (${flow.properties.state})`);
            });
        } else {
            console.log('BAP Error:', body);
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

testBapFlows();
