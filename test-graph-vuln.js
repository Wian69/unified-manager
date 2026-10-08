require('dotenv').config({ path: '.env.local' });

async function run() {
    try {
        const tenantId = process.env.AZURE_TENANT_ID;
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;

        console.log("Acquiring MS Graph token...");
        const tokenResponse = await fetch(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    scope: 'https://graph.microsoft.com/.default',
                    client_secret: clientSecret,
                    grant_type: 'client_credentials'
                })
            }
        );
        
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            console.error("Token error:", tokenData);
            return;
        }
        const token = tokenData.access_token;
        console.log("Graph Token acquired!");

        console.log("Fetching vulnerabilities via Graph Beta...");
        const res = await fetch('https://graph.microsoft.com/beta/security/vulnerabilities?$top=5', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (!res.ok) {
            console.error("Graph API Error:", data);
            return;
        }
        
        console.log(`Success! Data:`, data);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
