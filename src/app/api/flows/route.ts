import { NextResponse } from 'next/server';
import { getPowerAutomateToken } from '@/lib/powerautomate';

export const dynamic = 'force-dynamic';

const DATAVERSE_URL = 'https://eqnoutsourcedservicessaptyltddef.api.crm4.dynamics.com';

export async function GET() {
    try {
        const token = await getPowerAutomateToken();
        
        // Query Dataverse for Modern Flows (category 5)
        // We filter for statecode 1 (Activated) or 0 (Draft)
        // We also order by modifiedon desc to find the most relevant ones
        const url = `${DATAVERSE_URL}/api/data/v9.2/workflows?$filter=category eq 5 and type eq 1&$select=name,statecode,workflowid,modifiedon,createdon,description&$orderby=modifiedon desc`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Dataverse API Error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        
        // Map Dataverse format to the App's expected Flow format
        // We also filter out any system-level flows that might still be showing up
        const flows = (data.value || [])
            .filter((f: any) => !f.name.startsWith('Dynamics 365') && !f.name.includes('MSCRM_'))
            .map((f: any) => ({
                id: f.workflowid,
                name: f.name,
                properties: {
                    displayName: f.name,
                    state: f.statecode === 1 ? 'Started' : 'Stopped',
                    createdTime: f.createdon,
                    lastModifiedTime: f.modifiedon,
                    description: f.description
                }
            }));
        
        return NextResponse.json({ flows });
    } catch (error: any) {
        console.error('[API] Flows List Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch cloud flows", details: error.message },
            { status: 500 }
        );
    }
}
