import { DeviceCodeCredential } from '@azure/identity';

async function main() {
    const credential = new DeviceCodeCredential({
        tenantId: '5d57c9a9-b1b5-4cd2-be8c-14b00490163d',
        clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
    });

    try {
        const tokenResponse = await credential.getToken('https://management.azure.com/.default');
        const token = tokenResponse.token;
        const apiVer = '2023-04-01-preview'; 
        
        const subscriptionId = 'e3c50190-beda-40f5-8348-9e28d605b149';
        const resourceGroup = 'rg-geos-prod';
        const emailServiceName = 'acs-equinox-email';
        const domainName = 'qa.eqncs.com';
        
        const baseUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Communication/emailServices/${emailServiceName}/domains/${domainName}?api-version=${apiVer}`;

        console.log(`Fetching DNS Verification Records for ${domainName}...`);
        const getRes = await fetch(baseUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const getResult = await getRes.json();
        
        if (getResult.properties && getResult.properties.verificationRecords) {
            console.log("\n====== REQUIRED DNS RECORDS ======");
            console.log(JSON.stringify(getResult.properties.verificationRecords, null, 2));
            console.log("==================================\n");
        } else {
            console.log("Could not find verification records yet.");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
