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

async function testGraphPowerAutomate() {
    try {
        console.log('Fetching Graph Token...');
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        const tokenRes = await credential.getToken('https://graph.microsoft.com/.default');
        const token = tokenRes.token;

        console.log('Testing Graph beta PowerAutomate endpoints...');
        const url = `https://graph.microsoft.com/beta/powerAutomate/environments`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        
        if (res.ok) {
            console.log('Environments found via Graph:', JSON.stringify(data, null, 2));
        } else {
            console.log('Graph Error:', JSON.stringify(data, null, 2));
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

testGraphPowerAutomate();
