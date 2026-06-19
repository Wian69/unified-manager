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
        const apiVer = '2024-02-01';

        let res = await fetch(`https://management.azure.com/subscriptions?api-version=2020-01-01`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        let data = await res.json();

        if (data.value && data.value.length > 0) {
            for (const sub of data.value) {
                const subId = sub.subscriptionId;
                
                // Find frontdoors
                const fdRes = await fetch(`https://management.azure.com/subscriptions/${subId}/providers/Microsoft.Cdn/profiles?api-version=${apiVer}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const profiles = await fdRes.json();
                
                if (profiles.value) {
                    for (const profile of profiles.value) {
                        if (profile.name === 'geos-frontdoor') {
                            console.log(`Found Front Door: ${profile.id}`);
                            
                            // Get rule sets
                            const rsRes = await fetch(`https://management.azure.com${profile.id}/ruleSets?api-version=${apiVer}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const ruleSets = await rsRes.json();
                            console.log("Rule Sets:", JSON.stringify(ruleSets, null, 2));

                            // Get routes
                            const routeRes = await fetch(`https://management.azure.com${profile.id}/customDomains?api-version=${apiVer}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const domains = await routeRes.json();
                            
                            const routesRes = await fetch(`https://management.azure.com${profile.id}/routes?api-version=${apiVer}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const routes = await routesRes.json();
                            console.log("Routes:", JSON.stringify(routes, null, 2));
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
