import { DeviceCodeCredential } from '@azure/identity';

async function main() {
    const credential = new DeviceCodeCredential({
        tenantId: '5d57c9a9-b1b5-4cd2-be8c-14b00490163d',
        clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
    });

    try {
        const tokenResponse = await credential.getToken('https://management.azure.com/.default');
        const token = tokenResponse.token;
        const apiVer = '2023-04-01-preview'; 
        
        const subscriptionId = 'e3c50190-beda-40f5-8348-9e28d605b149';
        
        console.log("Listing all EmailServices in subscription...");
        
        const res = await fetch(`https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Communication/emailServices?api-version=${apiVer}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = await res.json();
        if (result.value) {
            console.log("Found email services:", JSON.stringify(result.value.map((e: any) => e.id), null, 2));
        } else {
            console.log("No email services found or error:", result);
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

main().catch(console.error);
