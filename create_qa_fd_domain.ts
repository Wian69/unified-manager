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
        const customDomainName = 'qa-eqncs-com'; // Must be alphanumeric/hyphens
        
        const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Cdn/profiles/${profileName}/customDomains/${customDomainName}?api-version=${apiVer}`;

        console.log(`Creating Custom Domain qa.eqncs.com in Azure Front Door...`);
        
        const res = await fetch(url, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                properties: {
                    hostName: 'qa.eqncs.com',
                    tlsSettings: {
                        certificateType: 'ManagedCertificate',
                        minimumTlsVersion: 'TLS12'
                    }
                }
            })
        });

        if (!res.ok) {
            console.error("Failed to create Front Door custom domain:", await res.text());
            return;
        }

        console.log("Domain created successfully.");
        
        // Wait a few seconds
        await new Promise(r => setTimeout(r, 4000));
        
        const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const getResult = await getRes.json();
        
        console.log("\n====== FRONT DOOR VALIDATION RECORD ======");
        if (getResult.properties && getResult.properties.validationProperties) {
            console.log(JSON.stringify(getResult.properties.validationProperties, null, 2));
        } else {
            console.log("Validation properties not ready. Payload:", JSON.stringify(getResult, null, 2));
        }
        console.log("==========================================\n");

    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
