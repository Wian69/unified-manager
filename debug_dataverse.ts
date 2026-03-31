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

async function testDiscovery() {
    try {
        console.log('Fetching Discovery Token...');
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        // Resource for Global Discovery
        const tokenRes = await credential.getToken('https://globaldisco.crm.dynamics.com/.default');
        const token = tokenRes.token;

        console.log('Querying Global Discovery Service...');
        const url = `https://globaldisco.crm.dynamics.com/api/discovery/v2.0/Instances`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        
        if (res.ok) {
            console.log('Instances found:', data.value?.length);
            data.value?.forEach((inst: any) => {
                console.log(`- ${inst.FriendlyName || inst.UniqueName}`);
                console.log(`  URL: ${inst.ApiUrl}`);
            });
        } else {
            console.log('Discovery Error:', JSON.stringify(data, null, 2));
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

testDiscovery();
