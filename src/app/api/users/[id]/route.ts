import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const client = getGraphClient();
        
        const selectFields = [
            'id','displayName','givenName','surname','userPrincipalName','userType','createdDateTime',
            'jobTitle','companyName','department','employeeId','employeeType','employeeHireDate',
            'employeeLeaveDateTime',
            'officeLocation','streetAddress','city','state','postalCode','country',
            'businessPhones','mobilePhone','mail','mailNickname','accountEnabled','signInActivity'
        ].join(',');

        const userResponse = await client.api(`/users/${id}`)
            .select(selectFields)
            .get();

        // Fetch OneDrive link
        let oneDriveUrl = null;
        try {
            const driveRes = await client.api(`/users/${id}/drive`).select('webUrl').get();
            oneDriveUrl = driveRes.webUrl;
        } catch (e) {}

        return NextResponse.json({ ...userResponse, oneDriveUrl });
    } catch (error: any) {
        console.error('[API] Graph API Error (Get User):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch user details", details: error.message },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await request.json();
        const client = getGraphClient();
        
        // Ensure we only pass valid string/boolean fields that are meant to be updated
        const updateData: any = {};
        const updatableFields = [
            'displayName','givenName','surname','jobTitle',
            'officeLocation','streetAddress','city','state','postalCode','country',
            'mobilePhone'
        ];

        updatableFields.forEach(field => {
            if (body[field] !== undefined) {
                // If it's an empty string, set it to null to clear the field in Entra ID
                // Microsoft Graph prefers null over empty string for clearing many properties
                updateData[field] = body[field] === '' ? null : body[field];
            }
        });

        // Optional fields that might be read-only in some tenants - only include if not empty
        ['companyName', 'department'].forEach(field => {
            if (body[field]) {
                updateData[field] = body[field];
            }
        });

        // Special handling for businessPhones which is an array of strings in Graph API
        if (body.businessPhones !== undefined) {
            if (body.businessPhones === '') {
                updateData.businessPhones = [];
            } else {
                updateData.businessPhones = [body.businessPhones];
            }
        }

        console.log(`[API] Updating user ${id}:`, JSON.stringify(updateData, null, 2));
        
        try {
            console.log(`[API] Updating user ${id}:`, JSON.stringify(updateData, null, 2));
            await client.api(`/users/${id}`).update(updateData);
            return NextResponse.json({ success: true, message: "User updated successfully" });
        } catch (graphError: any) {
            const errorMsg = graphError.body || graphError.message;
            console.error('[API] Graph API Update Detail Error:', errorMsg);
            
            return NextResponse.json(
                { 
                    error: "Microsoft Graph rejected the update", 
                    details: graphError.message,
                    body: graphError.body ? (typeof graphError.body === 'string' ? JSON.parse(graphError.body) : graphError.body) : null
                },
                { status: graphError.statusCode || 500 }
            );
        }
    } catch (error: any) {
        console.error('[API] General Update Error:', error.message);
        return NextResponse.json(
            { error: "Failed to process update request", details: error.message },
            { status: 500 }
        );
    }
}
