import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            displayName, 
            givenName,
            surname,
            mailNickname, 
            userPrincipalName, 
            password, 
            jobTitle, 
            companyName,
            department, 
            officeLocation,
            mobilePhone,
            businessPhones,
            streetAddress,
            city,
            state,
            postalCode,
            country,
            licenseSkus,
            groupIds 
        } = body;

        if (!displayName || !userPrincipalName || !password) {
            return NextResponse.json({ error: "Missing required fields (displayName, UPN, password)" }, { status: 400 });
        }

        const client = getGraphClient();

        // 1. Create User in Entra ID
        const newUser = await client.api('/users').post({
            accountEnabled: true,
            displayName,
            givenName: givenName || '',
            surname: surname || '',
            mailNickname: mailNickname || userPrincipalName.split('@')[0],
            userPrincipalName,
            jobTitle: jobTitle || '',
            companyName: companyName || '',
            department: department || '',
            officeLocation: officeLocation || '',
            mobilePhone: mobilePhone || '',
            businessPhones: businessPhones ? [businessPhones] : [],
            streetAddress: streetAddress || '',
            city: city || '',
            state: state || '',
            postalCode: postalCode || '',
            country: country || '',
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

        // 3. Assign Group Memberships (if any)
        if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
            for (const groupId of groupIds) {
                try {
                    await client.api(`/groups/${groupId}/members/$ref`).post({
                        "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
                    });
                } catch (grpErr: any) {
                    console.error(`[API] Failed to add user to group ${groupId}:`, grpErr.message);
                    // Continue with other groups even if one fails
                }
            }
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
