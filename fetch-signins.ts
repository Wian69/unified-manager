import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from unified-manager-app/.env.local
dotenv.config({ path: path.join(__dirname, 'unified-manager-app', '.env.local') });

async function run() {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    
    if (!tenantId || !clientId || !clientSecret) {
        console.error("Missing Azure credentials in .env.local");
        return;
    }
    
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: ['https://graph.microsoft.com/.default'] });
    const client = Client.initWithMiddleware({ authProvider });
    
    let users = [];
    let url = '/users?$filter=endsWith(userPrincipalName, \'@partner.eqncs.com\')&$select=displayName,userPrincipalName,signInActivity&$top=500';
    
    try {
        while(url) {
            const res = await client.api(url).get();
            users.push(...res.value);
            url = res['@odata.nextLink'];
        }
        
        const formatted = users.map(u => ({
            Name: u.displayName,
            UPN: u.userPrincipalName,
            LastSignIn: u.signInActivity?.lastSignInDateTime ? new Date(u.signInActivity.lastSignInDateTime).toLocaleString() : 'No recent sign-in'
        }));

        console.table(formatted);
    } catch(e: any) {
        console.error("Error fetching users:", e.message);
        if (e.message.includes("Privileges")) {
            console.error("NOTE: You may need to grant AuditLog.Read.All application permission in Azure to read signInActivity.");
        }
    }
}
run();
