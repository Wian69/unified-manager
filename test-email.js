const { ClientSecretCredential } = require("@azure/identity");
require("dotenv").config({ path: ".env.local" });

const SITE_ID = "xxeqncs.sharepoint.com,21560bf0-53a4-4067-90c0-a711b01ea3f2,b8018860-10c2-49bf-82a7-811de2ce3c3e";
const LIST_ID = "ec7c28b2-d2bc-4d99-8550-499f385fd58d";

async function run() {
    const credential = new ClientSecretCredential(process.env.AZURE_TENANT_ID, process.env.AZURE_CLIENT_ID, process.env.AZURE_CLIENT_SECRET);
    const token = (await credential.getToken("https://graph.microsoft.com/.default")).token;
    const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items?$expand=fields&$top=5`;
    const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
    const data = await res.json();
    for (const item of data.value) {
        console.log(`Ticket: ${item.fields.TicketNumber} | Title: ${item.fields.Title} | Email keys: ${Object.keys(item.fields).filter(k => k.toLowerCase().includes("email"))}`);
    }
}
run();
