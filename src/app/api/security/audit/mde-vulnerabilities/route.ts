import { NextResponse } from 'next/server';
import { ClientSecretCredential } from '@azure/identity';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const tenantId = process.env.AZURE_TENANT_ID!;
        const clientId = process.env.AZURE_CLIENT_ID!;
        const clientSecret = process.env.AZURE_CLIENT_SECRET!;

        // Get token for Defender for Endpoint API (different scope than Graph)
        const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        const token = await credential.getToken('https://api.securitycenter.microsoft.com/.default');

        // Fetch vulnerabilities from MDE API
        const vulnResponse = await fetch('https://api.securitycenter.microsoft.com/api/vulnerabilities?$top=20&$orderby=severity', {
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!vulnResponse.ok) {
            const errorText = await vulnResponse.text();
            return NextResponse.json({ error: `MDE API Error: ${vulnResponse.status}`, details: errorText }, { status: vulnResponse.status });
        }

        const data = await vulnResponse.json();
        const vulnerabilities = data.value || [];

        // Separate by severity
        const critical = vulnerabilities.filter((v: any) => v.severity === 'Critical');
        const high = vulnerabilities.filter((v: any) => v.severity === 'High');
        const medium = vulnerabilities.filter((v: any) => v.severity === 'Medium');

        return NextResponse.json({
            totalReturned: vulnerabilities.length,
            critical: critical.length,
            high: high.length,
            medium: medium.length,
            vulnerabilities: vulnerabilities.map((v: any) => ({
                id: v.id,
                name: v.name,
                description: v.description,
                severity: v.severity,
                exposedMachines: v.exposedMachines,
                publishedOn: v.publishedOn,
                updatedOn: v.updatedOn,
                publicExploit: v.publicExploit,
                exploitVerified: v.exploitVerified
            }))
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
