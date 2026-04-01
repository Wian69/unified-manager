import { ClientSecretCredential } from '@azure/identity';
import fs from 'fs';

// Manual env loading
if (fs.existsSync('.env.local')) {
    const env = fs.readFileSync('.env.local', 'utf8');
    env.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            process.env[key] = value;
        }
    });
}

const DATAVERSE_URL = 'https://eqnoutsourcedservicessaptyltddef.api.crm4.dynamics.com';
const FORM_ID = 'qclXXbWx0ky-jBSwBJAWPQizCKDV_fFNhkvyT-NfaM1UOVJCWThNOFhVVU9UUElIVlowUFI1WE4zOS4u';

async function searchFlowsForFormId() {
    try {
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );
        
        const tokenRes = await credential.getToken(`${DATAVERSE_URL}/.default`);
        const token = tokenRes.token;

        console.log(`Searching all flows for Form ID: ${FORM_ID}...`);
        // We filter for category 5 (Modern flows) and search within clientdata
        const url = `${DATAVERSE_URL}/api/data/v9.2/workflows?$filter=category eq 5 and contains(clientdata, '${FORM_ID}')&$select=name,workflowid,clientdata`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        const data = await res.json();
        
        if (data.value && data.value.length > 0) {
            data.value.forEach((f: any) => {
                console.log(`\nMATCH FOUND: ${f.name}`);
                console.log(`Flow ID: ${f.workflowid}`);
                // Save full definition for inspection
                fs.writeFileSync(`flow_match_${f.workflowid}.json`, f.clientdata);
                console.log(`Full definition saved to flow_match_${f.workflowid}.json`);
            });
        } else {
            console.log('No flows found triggered by this form.');
        }

    } catch (error: any) {
        console.log('Error:', error.message);
    }
}

searchFlowsForFormId();
