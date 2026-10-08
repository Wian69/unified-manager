const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const { ClientSecretCredential } = require("@azure/identity");
require("dotenv").config({ path: ".env.local" });

const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
});
const client = Client.initWithMiddleware({ authProvider });

async function run() {
    try {
        const deviceName = "EQNCSLT002";
        console.log(`Searching for device: ${deviceName}`);
        
        // Search Azure AD Devices
        const adDevices = await client.api(`/devices?$filter=displayName eq '${deviceName}'`).get();
        console.log(`Found ${adDevices.value.length} Azure AD devices with this name.`);
        for (const d of adDevices.value) {
            console.log(`- ID: ${d.id}, OS: ${d.operatingSystem}, Trust: ${d.trustType}`);
            // Check groups this device belongs to
            const memberOf = await client.api(`/devices/${d.id}/memberOf`).get();
            for (const g of memberOf.value) {
                if (g["@odata.type"] === "#microsoft.graph.group") {
                    console.log(`  -> Member of Group: ${g.displayName} (ID: ${g.id})`);
                }
            }
        }

        // Search Intune Managed Devices
        const intuneDevices = await client.api(`/deviceManagement/managedDevices?$filter=deviceName eq '${deviceName}'`).get();
        console.log(`\nFound ${intuneDevices.value.length} Intune Managed devices with this name.`);
        for (const d of intuneDevices.value) {
            console.log(`- ID: ${d.id}, UPN: ${d.userPrincipalName}, Compliance: ${d.complianceState}`);
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
