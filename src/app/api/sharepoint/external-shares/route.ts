import { NextResponse } from 'next/server';
import { getExternalShares, saveExternalShares } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';
import crypto from 'crypto';

export async function GET() {
    try {
        const shares = await getExternalShares();
        // Sort by most recent
        shares.sort((a, b) => new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime());
        return NextResponse.json({ shares });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const shares = await getExternalShares();
        
        // Check if already invited
        const existing = shares.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (existing && existing.status === 'Accepted') {
            return NextResponse.json({ error: 'User has already accepted an invitation.' }, { status: 400 });
        }

        // Generate unique token
        const token = crypto.randomUUID();
        
        const newShare = {
            id: token,
            email: email.toLowerCase(),
            status: 'Pending',
            invitedAt: new Date().toISOString(),
            acceptedAt: null,
            ipAddress: null
        };

        if (existing) {
            // Update existing pending invite
            const idx = shares.findIndex(s => s.email === existing.email);
            shares[idx] = newShare;
        } else {
            shares.push(newShare);
        }

        await saveExternalShares(shares);

        // Send Email via Graph API
        const client = getGraphClient();
        const fromEmail = 'itsupport@eqncs.com'; // System email
        
        // Base URL for the agreement link
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const agreeLink = `${protocol}://${host}/sharepoint/agree?token=${token}`;

        const message = {
            message: {
                subject: `Secure Document Access: Signature Required`,
                body: {
                    contentType: "HTML",
                    content: `<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: Arial, sans-serif; background-color: #f4f6f8; color: #333; padding: 40px; }
.container { max-width: 600px; background: #fff; padding: 30px; border-radius: 8px; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
</style>
</head>
<body>
<div class="container">
<h2>Secure Document Access</h2>
<p>Equinox Group Holdings has shared secure files with you.</p>
<p>Before you can access these files, you are required to review the Terms of Use and electronically sign the agreement.</p>
<a href="${agreeLink}" class="btn">Review & Sign Agreement</a>
<p style="margin-top: 30px; font-size: 12px; color: #888;">This link is unique to you. Do not forward this email.</p>
</div>
</body>
</html>`
                },
                toRecipients: [
                    { emailAddress: { address: email } }
                ]
            },
            saveToSentItems: "false"
        };

        await client.api(`/users/${fromEmail}/sendMail`).post(message);

        return NextResponse.json({ success: true, share: newShare });
    } catch (e: any) {
        console.error("External Share POST Error:", e);
        return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
    }
}
