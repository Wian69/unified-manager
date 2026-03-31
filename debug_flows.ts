import { getPowerAutomateToken } from './src/lib/powerautomate';
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
    'https://service.powerautomate.com/.default',
    'https://api.flow.microsoft.com/.default',
    'https://management.azure.com/.default',
    'https://management.core.windows.net/.default'
];

async function testFlows() {
    for (const resource of RESOURCES) {
        try {
            console.log(`\n--- Testing Resource: ${resource} ---`);
            const credential = new ClientSecretCredential(
                process.env.AZURE_TENANT_ID!,
                process.env.AZURE_CLIENT_ID!,
                process.env.AZURE_CLIENT_SECRET!
            );
            
            const tokenRes = await credential.getToken(resource);
            const token = tokenRes.token;
            console.log('Token successfully obtained!');

            const url = `https://management.azure.com/providers/Microsoft.ProcessSimple/environments/${ENV_ID}/flows?api-version=2016-11-01`;
            const response = await fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log(`API Response Status: ${response.status} ${response.statusText}`);
            const body = await response.text();
            if (response.ok) {
                console.log('SUCCESS with this resource!');
                console.log('Found flows count:', JSON.parse(body).value?.length);
                return; 
            } else {
                console.log('API Error Body:', body);
            }
        } catch (error: any) {
            console.log('Token/API Error:', error.message);
        }
    }
}

testFlows();
