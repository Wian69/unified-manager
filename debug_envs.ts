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

async function testEnvironments() {
    try {
        console.log('Fetching Management Token...');
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        const tokenRes = await credential.getToken('https://management.azure.com/.default');
        const token = tokenRes.token;

        console.log('Fetching environments...');
        const url = `https://management.azure.com/providers/Microsoft.BusinessAppPlatform/environments?api-version=2020-07-01`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        
        if (res.ok) {
            console.log('Environments found:', data.value?.length);
            data.value?.forEach((env: any) => {
                console.log(`- ${env.name} (${env.properties?.displayName})`);
                console.log(`  Linked Dataverse: ${env.properties?.linkedEnvironmentMetadata?.instanceUrl}`);
            });
        } else {
            console.log('Error:', JSON.stringify(data, null, 2));
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

testEnvironments();
