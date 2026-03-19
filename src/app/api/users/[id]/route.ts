import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const client = getGraphClient();
        
        const userResponse = await client.api(`/users/${id}`)
            .select('id,displayName,userPrincipalName,jobTitle,department,mobilePhone,officeLocation,businessPhones,accountEnabled')
            .get();

        return NextResponse.json(userResponse);
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
        
        // Allowed fields to update
        const updateData: any = {};
        if (body.displayName !== undefined) updateData.displayName = body.displayName;
        if (body.jobTitle !== undefined) updateData.jobTitle = body.jobTitle;
        if (body.department !== undefined) updateData.department = body.department;
        if (body.mobilePhone !== undefined) updateData.mobilePhone = body.mobilePhone;
        if (body.officeLocation !== undefined) updateData.officeLocation = body.officeLocation;

        await client.api(`/users/${id}`).update(updateData);

        return NextResponse.json({ success: true, message: "User updated successfully" });
    } catch (error: any) {
        console.error('[API] Graph API Error (Update User):', error.message);
        return NextResponse.json(
            { error: "Failed to update user", details: error.message },
            { status: 500 }
        );
    }
}
