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

        const url = `${DATAVERSE_URL}/api/data/v9.2/workflows?$filter=category eq 5 and type eq 1&$select=name,workflowid,clientdata`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'OData-MaxVersion': '4.0', 'OData-Version': '4.0', 'Accept': 'application/json' } });
        const data = await response.json();
        
        const namesToInspect = ["IT Request", "Notification Completed and details for Partner and EQN users"];
        const flows = data.value.filter(f => namesToInspect.includes(f.name));
        
        for (const f of flows) {
            console.log(`\n=== ${f.name} ===`);
            if (f.clientdata) {
                const cd = JSON.parse(f.clientdata);
                console.log("Triggers:", Object.keys(cd.properties.definition.triggers));
                console.log("Actions:", Object.keys(cd.properties.definition.actions));
                
                // Let's dump the send email action if it exists
                const actions = cd.properties.definition.actions;
                for (const [key, value] of Object.entries(actions)) {
                    if (value.type === 'ApiConnection' && value.inputs?.host?.connectionName === 'shared_office365') {
                        console.log(`Email Action [${key}] inputs:`, JSON.stringify(value.inputs.body, null, 2));
                    }
                    if (value.type === 'If') {
                         console.log(`Condition Action [${key}] true actions:`, Object.keys(value.actions || {}));
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}
run();
