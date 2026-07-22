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
        console.log("Fetching all sites in the tenant...");
        let sites: any[] = [];
        let siteRes = await client.api('/sites?search=*').top(500).get();
        if (siteRes.value) sites.push(...siteRes.value);
        
        while (siteRes['@odata.nextLink']) {
            siteRes = await client.api(siteRes['@odata.nextLink']).get();
            if (siteRes.value) sites.push(...siteRes.value);
            console.log(`Fetched ${sites.length} sites...`);
            if (sites.length > 2000) break; // Safety cap
        }

        console.log(`Total sites found: ${sites.length}`);
        console.log("Checking each site for Annique's explicit access...");

        // Annique's user ID is 87a88702-f6e0-4588-b058-88d23b84410b
        const anniqueId = '87a88702-f6e0-4588-b058-88d23b84410b';
        let foundSites = [];

        // We will batch process this to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < sites.length; i += batchSize) {
            const batch = sites.slice(i, i + batchSize);
            const promises = batch.map(async (site) => {
                try {
                    const perms = await client.api(`/sites/${site.id}/permissions`).get();
                    const hasAccess = perms.value?.some((p: any) => {
                        const grantee = p.grantedToV2 || p.grantedTo;
                        if (!grantee) return false;
                        const targetId = grantee.user?.id || grantee.group?.id || grantee.siteGroup?.id;
                        return targetId === anniqueId;
                    });
                    if (hasAccess) {
                        return site;
                    }
                } catch(e) {}
                return null;
            });
            const results = await Promise.all(promises);
            for (const r of results) {
                if (r) {
                    foundSites.push(r);
                    console.log(`[ACCESS FOUND] ${r.displayName || r.name} (${r.webUrl})`);
                }
            }
        }
        
        console.log(`\nScan Complete. Found explicit access on ${foundSites.length} sites.`);

    } catch (e) {
        console.error(e);
    }
}

run();
