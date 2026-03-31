import { ClientSecretCredential } from '@azure/identity';

let paToken: string | null = null;
let paTokenExpiry: number = 0;

export async function getPowerAutomateToken() {
    // Return cached token if still valid (5 min buffer)
    if (paToken && paTokenExpiry > Date.now() + 300000) {
        return paToken;
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        throw new Error('Azure credentials missing for Power Automate authentication.');
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    
    // Scopes for Power Automate Management API
    const response = await credential.getToken('https://service.powerautomate.com/.default');
    
    paToken = response.token;
    paTokenExpiry = response.expiresOnTimestamp;

    return paToken;
}
