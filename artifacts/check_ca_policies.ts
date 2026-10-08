import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
});

const client = Client.initWithMiddleware({
    debugLogging: false,
    authProvider
});

async function run() {
    try {
        console.log("Checking Security Defaults...");
        const secDefaults = await client.api('/policies/identitySecurityDefaultsEnforcementPolicy').get();
        console.log("Security Defaults Enabled:", secDefaults.isEnabled);

        console.log("\nChecking Conditional Access Policies...");
        const caPolicies = await client.api('/identity/conditionalAccess/policies').get();
        console.log(`Found ${caPolicies.value.length} Conditional Access policies.`);
        caPolicies.value.forEach((p: any) => {
            console.log(`- ${p.displayName} (State: ${p.state})`);
            if (p.conditions && p.conditions.userRiskLevels && p.conditions.userRiskLevels.length > 0) {
                console.log(`  --> User Risk Levels: ${p.conditions.userRiskLevels.join(', ')}`);
            }
        });

    } catch (e: any) {
        console.error('Error:', e.message);
        if (e.body) console.error(JSON.stringify(e.body, null, 2));
    }
}

run();
