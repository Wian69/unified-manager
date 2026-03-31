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
const RESOURCES = [
    '8578e004-a5c6-46e7-913e-12f58912df43/.default',
    'https://service.powerautomate.com/.default',
    'https://service.flow.microsoft.com/.default',
    'https://management.azure.com/.default'
];

async function testFlows() {
    for (const resource of RESOURCES) {
        try {
            console.log(`\n>>> Testing Resource: ${resource}`);
            const credential = new ClientSecretCredential(
                process.env.AZURE_TENANT_ID!,
                process.env.AZURE_CLIENT_ID!,
                process.env.AZURE_CLIENT_SECRET!
            );
            
            const tokenRes = await credential.getToken(resource);
            const token = tokenRes.token;
            console.log('--- Token obtained!');

            // Test 1: management.azure.com
            const url1 = `https://management.azure.com/providers/Microsoft.ProcessSimple/environments/${ENV_ID}/flows?api-version=2016-11-01`;
            const res1 = await fetch(url1, { headers: { 'Authorization': `Bearer ${token}` } });
            console.log(`--- API (management.azure.com): ${res1.status}`);
            if (res1.ok) { console.log('SUCCESS!'); return; }
            else { console.log('--- Body:', (await res1.text()).substring(0, 200)); }

            // Test 2: api.flow.microsoft.com
            const url2 = `https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/${ENV_ID}/flows?api-version=2016-11-01`;
            const res2 = await fetch(url2, { headers: { 'Authorization': `Bearer ${token}` } });
            console.log(`--- API (api.flow.microsoft.com): ${res2.status}`);
            if (res2.ok) { console.log('SUCCESS!'); return; }
            else { console.log('--- Body:', (await res2.text()).substring(0, 200)); }

        } catch (error: any) {
            console.log('--- Error:', error.message.split('\n')[0]);
        }
    }
}

testFlows();
