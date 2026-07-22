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
        const customDomainId = `${profileId}/customDomains/qa-eqncs-com`;

        console.log("Finding endpoints...");
        const endpointsRes = await fetch(`https://management.azure.com${profileId}/afdEndpoints?api-version=${apiVer}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const endpoints = await endpointsRes.json();
        
        if (endpoints.value && endpoints.value.length > 0) {
            for (const ep of endpoints.value) {
                console.log(`Checking routes for endpoint ${ep.name}...`);
                const routesRes = await fetch(`https://management.azure.com${ep.id}/routes?api-version=${apiVer}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const routes = await routesRes.json();
                
                if (routes.value) {
                    for (const route of routes.value) {
                        // Associate with the first route or 'geos-route'
                        console.log(`Updating route ${route.name} to include qa.eqncs.com...`);
                        
                        const currentDomains = route.properties.customDomains || [];
                        
                        // Check if already associated
                        if (!currentDomains.find((d: any) => d.id === customDomainId)) {
                            currentDomains.push({ id: customDomainId });
                        } else {
                            console.log("Custom domain already associated with this route.");
                            continue;
                        }

                        const updatedRoute = {
                            properties: {
                                ...route.properties,
                                customDomains: currentDomains
                            }
                        };

                        const updateRes = await fetch(`https://management.azure.com${route.id}?api-version=${apiVer}`, {
                            method: 'PUT',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedRoute)
                        });
                        
                        if (!updateRes.ok) {
                            console.error("Failed to update route:", await updateRes.text());
                        } else {
                            console.log("Route updated successfully!");
                        }
                    }
                }
            }
        } else {
            console.log("No endpoints found.");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
