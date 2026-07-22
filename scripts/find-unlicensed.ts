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
        console.log("Fetching all users to check licenses...");
        let users: any[] = [];
        let res = await client.api('/users')
            .select('displayName,userPrincipalName,assignedLicenses,accountEnabled')
            .top(999)
            .get();
        
        if (res.value) users.push(...res.value);
        
        while (res['@odata.nextLink']) {
            res = await client.api(res['@odata.nextLink']).get();
            if (res.value) users.push(...res.value);
        }

        const unlicensed = users.filter(u => !u.assignedLicenses || u.assignedLicenses.length === 0);
        
        console.log(`\nFound ${unlicensed.length} users with NO Microsoft licenses:`);
        for (const u of unlicensed) {
            const status = u.accountEnabled ? 'ENABLED' : 'DISABLED';
            console.log(`- ${u.displayName} (${u.userPrincipalName}) [${status}]`);
        }
        
    } catch (e: any) {
        console.error(`Error:`, e.message);
    }
}

run();
