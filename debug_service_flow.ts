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

async function testServiceFlowScope() {
    try {
        console.log('Fetching Token for https://service.flow.microsoft.com/.default...');
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        const tokenRes = await credential.getToken('https://service.flow.microsoft.com/.default');
        const token = tokenRes.token;

        console.log('Querying api.flow.microsoft.com for ALL flows...');
        const url = `https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/${ENV_ID}/flows?api-version=2016-11-01`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        
        if (res.ok) {
            console.log('Flows found:', data.value?.length);
            data.value?.forEach((f: any) => {
                console.log(`- ${f.properties.displayName}`);
            });
        } else {
            console.log('Error:', JSON.stringify(data, null, 2));
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

testServiceFlowScope();
