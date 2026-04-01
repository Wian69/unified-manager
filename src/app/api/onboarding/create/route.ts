import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { displayName, mailNickname, userPrincipalName, password, jobTitle, department, officeLocation, licenseSkus } = body;

        if (!displayName || !userPrincipalName || !password) {
            return NextResponse.json({ error: "Missing required fields (displayName, UPN, password)" }, { status: 400 });
        }

        const client = getGraphClient();

        // 1. Create User in Entra ID
        const newUser = await client.api('/users').post({
            accountEnabled: true,
            displayName,
            mailNickname,
            userPrincipalName,
            jobTitle: jobTitle || '',
            department: department || '',
            officeLocation: officeLocation || '',
            passwordProfile: {
                forceChangePasswordNextSignIn: true,
                password: password
            }
        });

        const userId = newUser.id;

        // 2. Assign Licenses (if any)
        if (licenseSkus && Array.isArray(licenseSkus) && licenseSkus.length > 0) {
            const addLicenses = licenseSkus.map((skuId: string) => ({
                disabledPlans: [],
                skuId
            }));

            await client.api(`/users/${userId}/assignLicense`).post({
                addLicenses,
                removeLicenses: []
            });
        }

        return NextResponse.json({ 
            success: true, 
            userId,
            userPrincipalName,
            status: "Provisioned successfully" 
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API] Onboarding Creation Error:', error.message);
        return NextResponse.json(
            { 
                error: "Failed to provision user", 
                details: error.body || error.message,
                code: error.code || "UNKNOWN_ERROR"
            },
            { status: 500 }
        );
    }
}
