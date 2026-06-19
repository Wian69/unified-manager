import { DeviceCodeCredential } from '@azure/identity';

async function main() {
    console.log("Starting authentication with Device Code...");
    const credential = new DeviceCodeCredential({
        tenantId: '5d57c9a9-b1b5-4cd2-be8c-14b00490163d',
        clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
        userPromptCallback: (info) => {
            console.log('\n=================================================');
            console.log('ACTION REQUIRED:');
            console.log(info.message);
            console.log('=================================================\n');
        }
    });

    try {
        const tokenResponse = await credential.getToken('https://management.azure.com/.default');
        console.log("Token obtained successfully.");
        const token = tokenResponse.token;
        const apiVer = '2018-05-01'; // DNS API version
        
        const subscriptionId = 'e3c50190-beda-40f5-8348-9e28d605b149';
        
        console.log("Locating eqncs.com DNS zone...");
        const zonesRes = await fetch(`https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Network/dnszones?api-version=${apiVer}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const zones = await zonesRes.json();
        const zone = zones.value?.find((z: any) => z.name === 'eqncs.com');
        
        if (!zone) {
            throw new Error("Could not find eqncs.com DNS zone in subscription.");
        }
        
        const zoneIdParts = zone.id.split('/');
        const resourceGroup = zoneIdParts[4];
        const zoneName = zoneIdParts[8];
        
        console.log(`Found zone in resource group: ${resourceGroup}`);
        
        const baseUrl = `https://management.azure.com${zone.id}`;

        // Utility to PUT record
        const putRecord = async (recordType: string, recordName: string, body: any) => {
            const url = `${baseUrl}/${recordType}/${recordName}?api-version=${apiVer}`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                console.error(`Failed to create ${recordName} (${recordType}):`, await res.text());
            } else {
                console.log(`Successfully created ${recordName} (${recordType})`);
            }
        };

        // 1. dev TXT
        await putRecord('TXT', 'dev', {
            properties: {
                TTL: 3600,
                TXTRecords: [
                    { value: ["ms-domain-verification=c520fdb4-e492-407c-8dec-c6120dc2276e"] },
                    { value: ["v=spf1 include:spf.protection.outlook.com -all"] }
                ]
            }
        });

        // 2. dev CNAME
        await putRecord('CNAME', 'selector1-azurecomm-prod-net._domainkey.dev', {
            properties: { TTL: 3600, CNAMERecord: { cname: "selector1-azurecomm-prod-net._domainkey.azurecomm.net" } }
        });
        await putRecord('CNAME', 'selector2-azurecomm-prod-net._domainkey.dev', {
            properties: { TTL: 3600, CNAMERecord: { cname: "selector2-azurecomm-prod-net._domainkey.azurecomm.net" } }
        });

        // 3. staging TXT
        await putRecord('TXT', 'staging', {
            properties: {
                TTL: 3600,
                TXTRecords: [
                    { value: ["ms-domain-verification=99210dc1-d275-46f0-b655-76b346a9db14"] },
                    { value: ["v=spf1 include:spf.protection.outlook.com -all"] }
                ]
            }
        });

        // 4. staging CNAME
        await putRecord('CNAME', 'selector1-azurecomm-prod-net._domainkey.staging', {
            properties: { TTL: 3600, CNAMERecord: { cname: "selector1-azurecomm-prod-net._domainkey.azurecomm.net" } }
        });
        await putRecord('CNAME', 'selector2-azurecomm-prod-net._domainkey.staging', {
            properties: { TTL: 3600, CNAMERecord: { cname: "selector2-azurecomm-prod-net._domainkey.azurecomm.net" } }
        });

        console.log("All DNS records successfully published!");

    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
