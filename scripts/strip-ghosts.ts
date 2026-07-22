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
    const userIds = [
        "a99cb4b0-61de-4518-9684-6b29bfbf0fc6", // Jofrie
        "c2e6e5fa-f814-4a2d-bf97-b51cf62dcbb0", // Pierre
        "dbf52b67-722d-4a38-bfe1-0bb8e60cef91", // Tanya
        "c7869ca2-82a4-4a3f-bae8-02033884cae9", // Ruhann
        "0750eb54-78ed-4c3f-953b-3c2ce3906c09", // Ruhann
        "b46055a8-a84a-4b49-96ca-16a8f5eb46bc", // Ruhann
        "85fe602e-272e-45f7-a1f5-355cf2e72384", // Juha
        "1643ed7c-e9df-4fe9-90ae-584e7031c87a", // Amorette
        "da193527-b280-4931-809c-71b43041b713"  // Carla
    ];
    
    for (const uid of userIds) {
        try {
            console.log(`\n--- Stripping access for User ID: ${uid} ---`);
            // 1. Get all static groups
            const groupsRes = await client.api(`/users/${uid}/memberOf`).get();
            const groups = groupsRes.value || [];
            
            let removedCount = 0;
            for (const g of groups) {
                if (g['@odata.type'] === '#microsoft.graph.group') {
                    // Check if dynamic
                    const isDynamic = g.groupTypes?.includes('DynamicMembership');
                    if (!isDynamic) {
                        try {
                            await client.api(`/groups/${g.id}/members/${uid}/$ref`).delete();
                            console.log(`[REMOVED] from group: ${g.displayName}`);
                            removedCount++;
                        } catch (e: any) {
                            console.log(`[SKIP] Could not remove from group ${g.displayName} (Likely role-assignable or synced)`);
                        }
                    } else {
                        console.log(`[SKIP] Dynamic Group: ${g.displayName}`);
                    }
                }
            }
            console.log(`Removed from ${removedCount} static groups.`);
            
        } catch (e: any) {
            console.error(`Error processing user ${uid}:`, e.message);
        }
    }
    
    console.log("\nCleanup script complete. Permissions stripped.");
}

run();
