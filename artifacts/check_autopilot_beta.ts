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
        const serialNumber = '8R3CDS3';
        console.log(`Searching Autopilot (beta endpoint) for SN: ${serialNumber}`);
        
        // Search Autopilot in beta
        const autopilot = await client.api('/deviceManagement/windowsAutopilotDeviceIdentities')
            .version('beta')
            .filter(`serialNumber eq '${serialNumber}'`)
            .get();

        if (autopilot.value.length > 0) {
            autopilot.value.forEach((a: any) => {
                console.log(`\n--- Autopilot Record ---`);
                // Find any date fields
                for (const key of Object.keys(a)) {
                    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
                        console.log(`${key}: ${a[key]}`);
                    }
                }
                console.log(`Deployment Profile Assigned: ${a.deploymentProfileAssignedDateTime || 'N/A'}`);
            });
        } else {
            console.log('No Autopilot record found in beta endpoint.');
        }
        
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

run();
