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
        
        const profileId = '/subscriptions/e3c50190-beda-40f5-8348-9e28d605b149/resourcegroups/rg-geos-prod/providers/Microsoft.Cdn/profiles/geos-frontdoor';
        const ruleSetName = 'geosroutingrules'; // Rule set name must be alphanumeric in ARM
        
        // 1. Create the rule set
        console.log("Creating Rule Set...");
        const ruleSetRes = await fetch(`https://management.azure.com${profileId}/ruleSets/${ruleSetName}?api-version=${apiVer}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        console.log("Rule Set created:", await ruleSetRes.json());
        
        // Wait for rule set to be created
        await new Promise(r => setTimeout(r, 2000));

        // 2. Create the rule
        console.log("Creating Rule...");
        const ruleName = 'ApiOverride';
        const rulePayload = {
            properties: {
                order: 1,
                conditions: [
                    {
                        name: "UrlPath",
                        parameters: {
                            typeName: "DeliveryRuleUrlPathMatchConditionParameters",
                            operator: "BeginsWith",
                            matchValues: ["/api"]
                        }
                    }
                ],
                actions: [
                    {
                        name: "RouteConfigurationOverride",
                        parameters: {
                            typeName: "DeliveryRuleRouteConfigurationOverrideActionParameters",
                            originGroupOverride: {
                                originGroup: {
                                    id: `${profileId}/originGroups/geos-origin-group`
                                }
                            }
                        }
                    },
                    {
                        name: "ModifyRequestHeader",
                        parameters: {
                            typeName: "DeliveryRuleHeaderActionParameters",
                            headerAction: "Overwrite",
                            headerName: "Host",
                            value: "dev.businessafrica.ai"
                        }
                    }
                ]
            }
        };

        const ruleRes = await fetch(`https://management.azure.com${profileId}/ruleSets/${ruleSetName}/rules/${ruleName}?api-version=${apiVer}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(rulePayload)
        });
        console.log("Rule created:", await ruleRes.json());

        // 3. Find the endpoint and route
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
                        if (route.name === 'geos-route' || routes.value.length === 1) { // try to find geos-route or just pick the first one
                            console.log(`Updating route ${route.name}...`);
                            
                            // Add the rule set to the route
                            const currentRuleSets = route.properties.ruleSets || [];
                            const ruleSetId = { id: `${profileId}/ruleSets/${ruleSetName}` };
                            
                            // Only add if not already there
                            if (!currentRuleSets.find((rs: any) => rs.id === ruleSetId.id)) {
                                currentRuleSets.push(ruleSetId);
                            }

                            const updatedRoute = {
                                properties: {
                                    ...route.properties,
                                    ruleSets: currentRuleSets
                                }
                            };

                            const updateRes = await fetch(`https://management.azure.com${route.id}?api-version=${apiVer}`, {
                                method: 'PUT',
                                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify(updatedRoute)
                            });
                            console.log("Route updated:", await updateRes.json());
                        }
                    }
                }
            }
        }

        console.log("All changes applied successfully!");

    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
