import { DeviceCodeCredential } from '@azure/identity';

async function main() {
    const credential = new DeviceCodeCredential({
        tenantId: '5d57c9a9-b1b5-4cd2-be8c-14b00490163d',
        clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
    });

    try {
        const tokenResponse = await credential.getToken('https://management.azure.com/.default');
        const token = tokenResponse.token;
        
        console.log("Listing subscriptions...");
        const res = await fetch(`https://management.azure.com/subscriptions?api-version=2020-01-01`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const subs = await res.json();
        console.log("Subscriptions found:", subs.value?.map((s: any) => `${s.displayName} (${s.subscriptionId})`).join(', '));

        for (const sub of subs.value || []) {
            console.log(`Checking subscription: ${sub.displayName}...`);
            const zoneRes = await fetch(`https://management.azure.com/subscriptions/${sub.subscriptionId}/providers/Microsoft.Network/dnszones?api-version=2018-05-01`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const zones = await zoneRes.json();
            const zone = zones.value?.find((z: any) => z.name === 'eqncs.com');
            if (zone) {
                console.log("FOUND ZONE IN SUBSCRIPTION:", sub.displayName);
                console.log("ZONE ID:", zone.id);
                return;
            }
        }
        console.log("Zone eqncs.com not found in any subscription.");

    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
