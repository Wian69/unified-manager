import { NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';
import fs from 'fs';
import path from 'path';

const CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"; // Microsoft Graph CLI
const TENANT_ID = "5d57c9a9-b1b5-4cd2-be8c-14b00490163d";
const TOKEN_PATH = path.join(process.cwd(), '.sharepoint_token');

async function getAccessToken() {
    if (!fs.existsSync(TOKEN_PATH)) {
        throw new Error("SharePoint authentication token missing. Please log in first.");
    }
    const refreshToken = fs.readFileSync(TOKEN_PATH, 'utf8').trim();

    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'https://graph.microsoft.com/Sites.ReadWrite.All https://graph.microsoft.com/Group.ReadWrite.All offline_access'
    });

    const response = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
    }
    if (data.refresh_token) {
        fs.writeFileSync(TOKEN_PATH, data.refresh_token);
    }
    return data.access_token;
}

const definitionSchema = {
    displayName: "SLA_Definitions",
    columns: [
        { name: "Obligation", text: {} },
        { name: "ContractRef", text: {} },
        { name: "Trigger", text: {} },
        { name: "Target", text: {} },
        { name: "Consequence", text: {} },
        { name: "OwnerRole", text: {} },
        { 
            name: "Category", 
            choice: { 
                choices: ["Response Time", "Compliance", "Governance", "Quality", "Continuity", "Data & Security", "Onboarding", "Financial", "Ethics & Legal"] 
            } 
        }
    ]
};

const trackerSchema = {
    displayName: "SLA_Tracker",
    columns: [
        { name: "Client", text: {} },
        { name: "DateLogged", dateTime: {} },
        { name: "DateDue", dateTime: {} },
        { name: "DateCompleted", dateTime: {} },
        { 
            name: "SLA_Status", 
            choice: { 
                choices: ["On Track", "At Risk", "Breached", "Completed", "Pending"] 
            } 
        },
        { name: "ActualPerformance", text: {} },
        { name: "Notes", text: {} },
        { name: "SLA_ID", text: {} }
    ]
};

const breachSchema = {
    displayName: "Breach_Log",
    columns: [
        { name: "DateIdentified", dateTime: {} },
        { name: "Description", text: {} },
        { 
            name: "RemediationStatus", 
            choice: { 
                choices: ["Open", "In Progress", "Resolved"] 
            } 
        },
        { name: "RemediationDeadline", dateTime: {} },
        { name: "NotifiedClient", text: {} },
        { name: "SLA_ID", text: {} }
    ]
};

const seedData = [
    { title: "SLA-01", Obligation: "acknowledge within 1 Business Day; substantive response within 2 Business Days", ContractRef: "Exhibit D 1.1", Trigger: "Inbound query flagged Standard", Target: "Ack <=1 BD; Response <=2 BD", Consequence: "3 failures in rolling 3 months = material breach & termination right", OwnerRole: "Regional Director", Category: "Response Time" },
    { title: "SLA-02", Obligation: "acknowledge within 4 hours; substantive response within 1 Business Day", ContractRef: "Exhibit D 1.2", Trigger: "Query flagged Urgent by client", Target: "Ack <=4 hrs; Response <=1 BD", Consequence: "3 failures in rolling 3 months = material breach & termination right", OwnerRole: "Regional Director", Category: "Response Time" },
    { title: "SLA-03", Obligation: "acknowledge within 4 hours (or by COB same day if shorter) + plan for further communication", ContractRef: "Exhibit D 1.3", Trigger: "Escalation raised", Target: "Ack <=4 hrs / COB same day", Consequence: "Contributes to breach count under Exhibit D.2", OwnerRole: "Regional Director", Category: "Response Time" },
    { title: "SLA-04", Obligation: "issue reminders to Diligent at least 6 weeks before every filing deadline", ContractRef: "Exhibit B 1.1(B)", Trigger: "Per Client entity deadline calendar", Target: ">= 6 weeks' advance notice", Consequence: "Deficient service - re-provide at own cost; fee recovery by Diligent (3.3)", OwnerRole: "Regional Director (cascade to CoSec)", Category: "Compliance" },
    { title: "SLA-05", Obligation: "conduct short monthly status calls to review open items", ContractRef: "Exhibit B 1.1(I)", Trigger: "Month-end (recurring)", Target: "1 call per active SOW per month", Consequence: "Failure = potential service deficiency (3.3)", OwnerRole: "CEO (rollover to RDs after 2 months)", Category: "Governance" },
    { title: "SLA-06", Obligation: "Services meet Best Industry Practice standard at all times", ContractRef: "VSA 3.2(A)", Trigger: "Ongoing / all services", Target: "Upper-quartile industry standard", Consequence: "Material breach; re-provide or Diligent hires replacement at Vendor cost (3.3)", OwnerRole: "CEO/CoS", Category: "Quality" },
    { title: "SLA-07", Obligation: "Business Continuity & Disaster Recovery Plan maintained and available on request", ContractRef: "VSA 4.1(E)", Trigger: "Diligent requests BC&DR Plan", Target: "Provide within reasonable notice", Consequence: "Breach of warranty (4.1)", OwnerRole: "Office of the CTO", Category: "Continuity" },
    { title: "SLA-08", Obligation: "Security incident notification within 24 hours of discovery", ContractRef: "Exhibit C B.5", Trigger: "Security incident detected", Target: "<=24 hours from discovery", Consequence: "Material breach; immediate termination right (Exhibit C B)", OwnerRole: "Office of the CTO", Category: "Data & Security" },
    { title: "SLA-09", Obligation: "Annual security attestations/certifications provided to Diligent", ContractRef: "Exhibit C B.4", Trigger: "Annual (each contract year)", Target: "Once per year minimum", Consequence: "Breach of security obligations (Exhibit C B)", OwnerRole: "Office of the CTO", Category: "Data & Security" },
    { title: "SLA-10", Obligation: "Health Check (Non-Recurring): Entity Status Report completed within 1 month of Term start", ContractRef: "Exhibit B 2.2(A)", Trigger: "Once at Term commencement (or Change Request)", Target: "Within 1 month of Term start", Consequence: "Service deficiency; re-provide at own cost (3.3)", OwnerRole: "CoSec Team", Category: "Onboarding" },
    { title: "SLA-11", Obligation: "No sub-contracting without prior written consent of Diligent", ContractRef: "VSA 4.1(F)", Trigger: "Before any sub-contractor engagement", Target: "Written consent obtained first", Consequence: "Material breach (4.1)", OwnerRole: "Regional Director", Category: "Compliance" },
    { title: "SLA-12", Obligation: "Invoice submission inclusive of all taxes upon SOW execution; payment due within 45 days of accurate invoice", ContractRef: "VSA 6.2", Trigger: "Per SOW execution", Target: "Invoice submitted promptly; payment 45 BD", Consequence: "Interest/penalty at 1% per month on gross invoice after 30 days' notice", OwnerRole: "Regional Director", Category: "Financial" },
    { title: "SLA-13", Obligation: "Modern Slavery Risk Management Plan prepared and implemented; available to Diligent on request", ContractRef: "VSA 16.3", Trigger: "Ongoing; available on request", Target: "Plan in place at all times", Consequence: "Breach of 16; potential material breach", OwnerRole: "Head of Legal", Category: "Ethics & Legal" },
    { title: "SLA-14", Obligation: "Applicable Law compliance including AML legislation maintained at all times", ContractRef: "VSA 5.1(A)", Trigger: "Ongoing / continuous", Target: "Full compliance at all times", Consequence: "Irredeemable material breach; immediate termination (5.4)", OwnerRole: "Head of Legal", Category: "Ethics & Legal" }
];

async function createList(client: Client, siteId: string, schema: any) {
    const lists = await client.api(`/sites/${siteId}/lists`).select('id,displayName').get();
    const existingList = lists.value.find((l: any) => l.displayName === schema.displayName);
    
    if (existingList) return existingList.id;

    const newList = await client.api(`/sites/${siteId}/lists`).post({
        displayName: schema.displayName,
        columns: schema.columns,
        list: {
            template: "genericList"
        }
    });
    return newList.id;
}

async function seedDefinitions(client: Client, siteId: string, listId: string) {
    const items = await client.api(`/sites/${siteId}/lists/${listId}/items?expand=fields`).get();
    if (items.value && items.value.length > 0) return;

    for (const data of seedData) {
        await client.api(`/sites/${siteId}/lists/${listId}/items`).post({
            fields: {
                Title: data.title,
                Obligation: data.Obligation,
                ContractRef: data.ContractRef,
                Trigger: data.Trigger,
                Target: data.Target,
                Consequence: data.Consequence,
                OwnerRole: data.OwnerRole,
                Category: data.Category
            }
        });
    }
}

export async function POST() {
    try {
        const accessToken = await getAccessToken();
        const client = Client.init({
            authProvider: (done) => done(null, accessToken)
        });

        // Find 'SLA Tracker' Group
        const groups = await client.api('/groups').filter("displayName eq 'SLA Tracker'").get();
        if (!groups.value || groups.value.length === 0) {
            return NextResponse.json({ error: "SLA Tracker M365 Group not found. Please create it first." }, { status: 400 });
        }
        const groupId = groups.value[0].id;
        
        const site = await client.api(`/groups/${groupId}/sites/root`).get();
        const siteId = site.id;

        const defId = await createList(client, siteId, definitionSchema);
        await createList(client, siteId, trackerSchema);
        await createList(client, siteId, breachSchema);
        await seedDefinitions(client, siteId, defId);

        return NextResponse.json({ success: true, message: "SharePoint lists successfully configured and seeded!" });
    } catch (error: any) {
        console.error("SharePoint Configuration API Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
