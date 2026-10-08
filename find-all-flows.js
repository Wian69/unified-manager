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
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        const flows = data.value.filter(f => !f.name.startsWith('Dynamics 365') && !f.name.includes('MSCRM_'));
        console.log(`Found ${flows.length} flows total:`);
        for (const f of flows) {
            console.log(`- ${f.name}`);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
