import { DeviceCodeCredential } from '@azure/identity';

async function main() {
    const credential = new DeviceCodeCredential({
        tenantId: '5d57c9a9-b1b5-4cd2-be8c-14b00490163d',
        clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
    });

    try {
        const tokenResponse = await credential.getToken('https://management.azure.com/.default');
        const token = tokenResponse.token;
        const apiVer = '2024-02-01';
        
        const profileId = '/subscriptions/e3c50190-beda-40f5-8348-9e28d605b149/resourcegroups/rg-geos-prod/providers/Microsoft.Cdn/profiles/geos-frontdoor';

        console.log("Finding endpoints...");
        const endpointsRes = await fetch(`https://management.azure.com${profileId}/afdEndpoints?api-version=${apiVer}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const endpoints = await endpointsRes.json();
        
        if (endpoints.value && endpoints.value.length > 0) {
            for (const ep of endpoints.value) {
                if (ep.name === 'geos-ai') {
                    console.log(`Endpoint hostname: ${ep.properties.hostName}`);
                }
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
