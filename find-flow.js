const { ClientSecretCredential } = require('@azure/identity');
require("dotenv").config({ path: ".env.local" });

const DATAVERSE_URL = 'https://eqnoutsourcedservicessaptyltddef.api.crm4.dynamics.com';

async function run() {
    try {
        const tenantId = process.env.AZURE_TENANT_ID;
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;
        
        const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        const tokenResponse = await credential.getToken(`${DATAVERSE_URL}/.default`);
        const token = tokenResponse.token;

        console.log("Searching for flows in Dataverse...");
        const url = `${DATAVERSE_URL}/api/data/v9.2/workflows?$filter=category eq 5 and type eq 1&$select=name,statecode,workflowid,modifiedon,createdon,description,clientdata&$orderby=modifiedon desc`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        
        const supportFlows = data.value.filter(f => f.name.toLowerCase().includes('support') || f.name.toLowerCase().includes('ticket') || f.name.toLowerCase().includes('status'));
        
        console.log(`Found ${supportFlows.length} matching flows:`);
        for (const f of supportFlows) {
            console.log(`\n==================\nNAME: ${f.name}`);
            console.log(`ID: ${f.workflowid}`);
            if (f.clientdata) {
                try {
                    const clientData = JSON.parse(f.clientdata);
                    console.log("TRIGGERS:", Object.keys(clientData.properties.definition.triggers));
                    console.log("ACTIONS:", Object.keys(clientData.properties.definition.actions));
                    // Look for email actions
                    const actions = clientData.properties.definition.actions;
                    for (const [key, value] of Object.entries(actions)) {
                        if (value.type === 'ApiConnection' && value.inputs?.host?.connectionName === 'shared_office365') {
                            console.log(`- Email action found: ${key}`);
                        }
                    }
                } catch(e) {
                    console.log("Could not parse clientdata");
                }
            } else {
                console.log("No clientdata available.");
            }
        }
        
    } catch (e) {
        console.error(e);
    }
}
run();
