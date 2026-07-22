import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const credential = new ClientSecretCredential(
            process.env.AZURE_TENANT_ID!,
            process.env.AZURE_CLIENT_ID!,
            process.env.AZURE_CLIENT_SECRET!
        );

        console.log('Fetching token for SharePoint REST API...');
        const token = await credential.getToken('https://xxeqncs.sharepoint.com/.default');
        console.log('Token acquired. Calling SharePoint REST API...');

        // Just fetch the site users to see if it works
        const response = await fetch('https://xxeqncs.sharepoint.com/_api/web/siteusers?$top=2', {
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Accept': 'application/json;odata=nometadata'
            }
        });

        if (!response.ok) {
            console.error('Error fetching site users:', response.status, await response.text());
        } else {
            const data = await response.json();
            console.log('Site users:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

run();
