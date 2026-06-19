import { NextResponse } from 'next/server';
import { ClientSecretCredential } from '@azure/identity';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const tenantId = process.env.AZURE_TENANT_ID!;
        const clientId = process.env.AZURE_CLIENT_ID!;
        const clientSecret = process.env.AZURE_CLIENT_SECRET!;

        const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        const token = await credential.getToken('https://api.securitycenter.microsoft.com/.default');

        // Try multiple MDE endpoints to find what permissions we have
        const endpoints = [
            { name: 'recommendations', url: 'https://api.securitycenter.microsoft.com/api/recommendations?$top=10' },
            { name: 'software', url: 'https://api.securitycenter.microsoft.com/api/Software?$top=10' },
            { name: 'machines', url: 'https://api.securitycenter.microsoft.com/api/machines?$top=5' },
        ];

        const results: any = {};

        for (const ep of endpoints) {
            try {
                const response = await fetch(ep.url, {
                    headers: { 'Authorization': `Bearer ${token.token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    results[ep.name] = {
                        status: 'OK',
                        count: data.value?.length || 0,
                        data: data.value?.slice(0, 5)
                    };
                } else {
                    const errText = await response.text();
                    results[ep.name] = { status: response.status, error: errText.substring(0, 200) };
                }
            } catch (e: any) {
                results[ep.name] = { status: 'error', error: e.message };
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
