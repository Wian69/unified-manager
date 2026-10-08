const { ClientSecretCredential } = require('@azure/identity');
require("dotenv").config({ path: ".env.local" });

const SITE_ID = 'xxeqncs.sharepoint.com,21560bf0-53a4-4067-90c0-a711b01ea3f2,b8018860-10c2-49bf-82a7-811de2ce3c3e';
const LIST_ID = 'ec7c28b2-d2bc-4d99-8550-499f385fd58d';

async function run() {
    try {
        const tenantId = process.env.AZURE_TENANT_ID;
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;
        
        const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        const tokenResponse = await credential.getToken(`https://graph.microsoft.com/.default`);
        const token = tokenResponse.token;

        const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/columns`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        
        for (const col of data.value) {
            if (!col.hidden) {
                console.log(`Name: ${col.name}, Display: ${col.displayName}, readOnly: ${col.readOnly}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
run();
