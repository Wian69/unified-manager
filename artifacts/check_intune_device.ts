import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
});

const client = Client.initWithMiddleware({
    debugLogging: false,
    authProvider
});

async function run() {
    try {
        const deviceName = 'eqncslt007';
        console.log(`Searching for Intune device: ${deviceName}`);
        
        const devices = await client.api(`/deviceManagement/managedDevices`)
            .filter(`deviceName eq '${deviceName}'`)
            .select('deviceName,enrolledDateTime,lastSyncDateTime,model,manufacturer')
            .get();
        
        if (devices.value.length > 0) {
            const device = devices.value[0];
            console.log('\n--- Device Details ---');
            console.log(`Device Name: ${device.deviceName}`);
            console.log(`Model: ${device.manufacturer} ${device.model}`);
            console.log(`First Enrolled/Connected: ${device.enrolledDateTime}`);
            console.log(`Last Sync: ${device.lastSyncDateTime}`);
        } else {
            console.log(`Device ${deviceName} not found in Intune.`);
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

run();
