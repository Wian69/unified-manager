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
        
        const subscriptionId = 'e3c50190-beda-40f5-8348-9e28d605b149';
        const resourceGroup = 'rg-geos-prod';
        const profileName = 'geos-frontdoor';
        const customDomainName = 'qa-eqncs-com';
        
        const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Cdn/profiles/${profileName}/customDomains/${customDomainName}?api-version=${apiVer}`;

        console.log(`Fetching Front Door Validation Token for qa.eqncs.com...`);
        
        for (let i = 0; i < 5; i++) {
            const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const getResult = await getRes.json();
            
            if (getResult.properties && getResult.properties.validationProperties && getResult.properties.validationProperties.validationToken) {
                console.log("\n====== FRONT DOOR VALIDATION RECORD ======");
                console.log(JSON.stringify(getResult.properties.validationProperties, null, 2));
                console.log("==========================================\n");
                return;
            }
            
            console.log("Validation token not ready yet, waiting 5 seconds...");
            await new Promise(r => setTimeout(r, 5000));
        }

        console.log("Validation token is still not ready. We may need to check again in a minute.");

    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
