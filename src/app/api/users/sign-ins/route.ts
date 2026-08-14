import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        let users: any[] = [];
        let url = "/users?$filter=endsWith(userPrincipalName, '@partner.eqncs.com')&$select=displayName,userPrincipalName,signInActivity&$top=999";
        
        while (url) {
            const res = await client.api(url).get();
            if (res.value) {
                users.push(...res.value);
            }
            url = res['@odata.nextLink'];
        }

        const formatted = users.map(u => ({
            displayName: u.displayName,
            userPrincipalName: u.userPrincipalName,
            lastSignIn: u.signInActivity?.lastSignInDateTime || null
        }));

        formatted.sort((a, b) => a.displayName.localeCompare(b.displayName));

        return NextResponse.json({ users: formatted });
    } catch (error: any) {
        console.error("Error fetching sign-ins:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
