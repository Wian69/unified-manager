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

async function discoverDataverse() {
    try {
        console.log('Fetching Token for api.powerplatform.com...');
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        // Resource for Power Platform API
        const tokenRes = await credential.getToken('https://api.powerplatform.com/.default');
        const token = tokenRes.token;

        console.log('Querying api.powerplatform.com for environments...');
        // Correct endpoint for Public Cloud
        const url = `https://api.powerplatform.com/management/environments?api-version=2022-03-01-preview`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        
        if (res.ok) {
            data.value?.forEach((env: any) => {
                console.log(`\nEnvironment: ${env.name}`);
                console.log(`Display Name: ${env.properties?.displayName}`);
                console.log(`Dataverse URL: ${env.properties?.linkedEnvironmentMetadata?.instanceUrl}`);
            });
        } else {
            console.log('Error:', JSON.stringify(data, null, 2));
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

discoverDataverse();
