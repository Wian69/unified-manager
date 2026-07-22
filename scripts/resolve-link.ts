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
        const sharingUrl = "https://xxeqncs.sharepoint.com/:f:/t/SharesForexternalusers/IgBf_KoUk4HAQZvhF_JgdFH3AZZ1pwkxXvT0jmUcoq1zzi4?e=YG9uOf";
        
        // Encode URL to base64
        const base64Value = Buffer.from(sharingUrl).toString('base64');
        const encodedUrl = "u!" + base64Value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        console.log("Encoded URL:", encodedUrl);
        
        const driveItem = await client.api(`/shares/${encodedUrl}/driveItem`).get();
        console.log("DriveItem Data:", JSON.stringify(driveItem, null, 2));
        
    } catch (e: any) {
        console.error(`Error:`, e.message);
    }
}

run();
