import { DeviceCodeCredential } from '@azure/identity';

async function main() {
    const credential = new DeviceCodeCredential({
        tenantId: '5d57c9a9-b1b5-4cd2-be8c-14b00490163d',
        clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
        userPromptCallback: (info) => {
            console.log(info.message);
        }
    });

    const tokenResponse = await credential.getToken('https://management.azure.com/.default');
    const token = tokenResponse.token;
    const apiVer = '2024-02-01';
    const profileId = '/subscriptions/e3c50190-beda-40f5-8348-9e28d605b149/resourcegroups/rg-geos-prod/providers/Microsoft.Cdn/profiles/geos-frontdoor';

    const ruleRes = await fetch(`https://management.azure.com${profileId}/ruleSets/geosroutingrules/rules?api-version=${apiVer}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Rules:", JSON.stringify(await ruleRes.json(), null, 2));
}

main().catch(console.error);
