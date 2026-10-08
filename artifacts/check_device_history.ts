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
        console.log(`Searching for Azure AD (Entra) and Autopilot records for: ${deviceName}`);
        
        // 1. Search Azure AD Devices
        const aadDevices = await client.api('/devices')
            .filter(`displayName eq '${deviceName}'`)
            .select('displayName,createdDateTime,approximateLastSignInDateTime,deviceId,profileType')
            .get();
            
        console.log('\n--- Entra ID (Azure AD) Records ---');
        if (aadDevices.value.length > 0) {
            aadDevices.value.forEach((d: any) => {
                console.log(`Found AAD Record created at: ${d.createdDateTime}`);
                console.log(`Last Sign In: ${d.approximateLastSignInDateTime}`);
                console.log(`Device ID: ${d.deviceId}`);
                console.log('---');
            });
        } else {
            console.log('No records found in Entra ID.');
        }

        // 2. We need the Serial Number to find it in Autopilot
        const managedDevices = await client.api(`/deviceManagement/managedDevices`)
            .filter(`deviceName eq '${deviceName}'`)
            .select('serialNumber')
            .get();

        if (managedDevices.value.length > 0) {
            const sn = managedDevices.value[0].serialNumber;
            console.log(`\nFound Serial Number in Intune: ${sn}`);
            
            // Search Autopilot
            const autopilot = await client.api('/deviceManagement/windowsAutopilotDeviceIdentities')
                .filter(`serialNumber eq '${sn}'`)
                .get();

            console.log('\n--- Windows Autopilot Records ---');
            if (autopilot.value.length > 0) {
                autopilot.value.forEach((a: any) => {
                    console.log(`Autopilot Enrollment State: ${a.enrollmentState}`);
                    console.log(`Autopilot Last Contacted: ${a.lastContactedDateTime}`);
                    // Note: Autopilot does not expose "createdDateTime" directly in Graph v1.0, 
                    // but we can look for it in beta if needed or just dump the object
                    console.log(`Full Autopilot Object: ${JSON.stringify(a)}`);
                });
            } else {
                console.log('No Autopilot record found for this serial number.');
            }
        }
        
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

run();
