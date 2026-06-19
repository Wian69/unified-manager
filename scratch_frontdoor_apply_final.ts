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

    const tokenResponse = await credential.getToken('https://management.azure.com/.default');
    const token = tokenResponse.token;
    const apiVer = '2024-02-01';
    const profileId = '/subscriptions/e3c50190-beda-40f5-8348-9e28d605b149/resourcegroups/rg-geos-prod/providers/Microsoft.Cdn/profiles/geos-frontdoor';
    const ruleSetName = 'geosroutingrules';

    console.log("Creating Rule (Without Host Header Override)...");
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
                }
            ]
        }
    };

    const ruleRes = await fetch(`https://management.azure.com${profileId}/ruleSets/${ruleSetName}/rules/${ruleName}?api-version=${apiVer}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(rulePayload)
    });
    
    const ruleResult = await ruleRes.json();
    console.log("Rule creation result:", JSON.stringify(ruleResult, null, 2));

    console.log("Changes applied. Waiting for Front Door propagation...");
}

main().catch(console.error);
