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
        console.log("Looking up Annique Detter...");
        const usersRes = await client.api('/users').filter("startsWith(displayName, 'Annique')").get();
        if (!usersRes.value || usersRes.value.length === 0) {
            console.log("Could not find Annique");
            return;
        }
        
        const annique = usersRes.value[0];
        console.log(`Found User: ${annique.displayName} (${annique.mail} | ID: ${annique.id})`);

        console.log("\n--- GROUP MEMBERSHIPS ---");
        const groupsRes = await client.api(`/users/${annique.id}/transitiveMemberOf`).get();
        const groups = groupsRes.value?.filter((g: any) => g['@odata.type'] === '#microsoft.graph.group') || [];
        for (const group of groups) {
            console.log(`- Group: ${group.displayName} (ID: ${group.id})`);
        }

        console.log("\n--- DIRECT SHAREPOINT ACCESS ---");
        
        console.log("1. Followed Sites:");
        try {
            const followed = await client.api(`/users/${annique.id}/sites/followed`).get();
            for (const site of followed.value || []) console.log(`- [Followed] ${site.displayName}`);
        } catch(e) {}

        console.log("2. Recent Folders:");
        try {
            const recent = await client.api(`/users/${annique.id}/drive/recent`).get();
            for (const rf of (recent.value || []).filter((i:any) => !!i.folder)) console.log(`- [Recent Folder] ${rf.name} (${rf.webUrl})`);
        } catch(e) {}

        console.log("3. Ziwani Search (Deep Scan):");
        try {
            const searchRes = await client.api('/search/query').post({
                requests: [{
                    entityTypes: ['driveItem'],
                    query: { queryString: '"Ziwani" isDocument:false' },
                    region: 'ZAF',
                    from: 0,
                    size: 25
                }]
            });
            const hits = searchRes.value?.[0]?.hitsContainers?.[0]?.hits || [];
            let foundCount = 0;
            for (const hit of hits) {
                const item = hit.resource;
                if (!item.id || !item.parentReference?.driveId) continue;
                try {
                    const perms = await client.api(`/drives/${item.parentReference.driveId}/items/${item.id}/permissions`).get();
                    const hasAccess = perms.value?.some((p: any) => {
                        const grantee = p.grantedToV2 || p.grantedTo;
                        if (!grantee) return false;
                        const targetId = grantee.user?.id || grantee.group?.id || grantee.siteGroup?.id;
                        return targetId === annique.id || groups.map((g:any) => g.id).includes(targetId);
                    });
                    if (hasAccess) {
                        console.log(`- [Direct Access] ${item.name} (${item.webUrl})`);
                        foundCount++;
                    }
                } catch(e) {}
            }
            if (foundCount === 0) console.log("- No direct access found under Ziwani keywords.");
        } catch(e) {
            console.error("Search failed:", e.message);
        }

    } catch (e) {
        console.error(e);
    }
}

run();
