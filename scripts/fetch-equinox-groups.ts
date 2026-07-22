import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const tenantId = process.env.AZURE_TENANT_ID!;
const clientId = process.env.AZURE_CLIENT_ID!;
const clientSecret = process.env.AZURE_CLIENT_SECRET!;

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: ['https://graph.microsoft.com/.default'] });
const client = Client.initWithMiddleware({ authProvider });

async function run() {
    try {
        console.log("Fetching all groups...");
        let groups: any[] = [];
        let res = await client.api('/groups')
            .select('id,displayName,description,groupTypes,membershipRule,securityEnabled,mailEnabled')
            .top(999)
            .get();
        
        if (res.value) groups.push(...res.value);
        
        while (res['@odata.nextLink']) {
            res = await client.api(res['@odata.nextLink']).get();
            if (res.value) groups.push(...res.value);
        }

        const equinoxGroups = groups.filter(g => g.displayName?.toLowerCase().includes('equinox'));
        
        console.log(JSON.stringify({
            totalGroups: groups.length,
            equinoxGroups: equinoxGroups.map(g => ({
                name: g.displayName,
                description: g.description,
                type: g.groupTypes?.includes('DynamicMembership') ? 'Dynamic' : 'Assigned',
                rule: g.membershipRule || 'N/A',
                security: g.securityEnabled,
                mail: g.mailEnabled
            }))
        }, null, 2));
        
    } catch (e: any) {
        console.error(`Error:`, e.message);
    }
}

run();
