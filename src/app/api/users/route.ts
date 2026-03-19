import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch users from Entra ID
        const usersResponse = await client.api('/users')
            .select('id,displayName,userPrincipalName,jobTitle,department,accountEnabled')
            .get();

        const users = usersResponse.value || [];

        // Sort alphabetically by displayName
        users.sort((a: any, b: any) => (a.displayName || '').localeCompare(b.displayName || ''));

        return NextResponse.json({
            users: users,
            activeUsers: users.filter((u: any) => u.accountEnabled).length,
        });
    } catch (error: any) {
        console.error('[API] Graph API Error (Users):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch users", details: error.message },
            { status: 500 }
        );
    }
}
