import { NextResponse } from 'next/server';
import { getExternalShares, saveExternalShares } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';
import { ResponseType } from '@microsoft/microsoft-graph-client';
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
        const { email, targetUrl } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }
        
        if (!targetUrl) {
            return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
        }

        const shares = await getExternalShares();
        
        // Check if already invited
        const existing = shares.find(s => s.email.toLowerCase() === email.toLowerCase() && s.targetUrl === targetUrl);
        if (existing && existing.status === 'Accepted') {
            return NextResponse.json({ error: 'User has already accepted an invitation for this exact folder.' }, { status: 400 });
        }

        // Generate unique token
        const token = crypto.randomUUID();
        
        const newShare = {
            id: token,
            email: email.toLowerCase(),
            targetUrl,
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
                subject: `Invitation to collaborate on Equinox Group Holdings documents`,
                body: {
                    contentType: "HTML",
                    content: `<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
.btn { display: inline-block; padding: 10px 20px; background-color: #005A9E; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }
.footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h2 style="color: #005A9E; margin: 0;">Equinox Group Holdings</h2>
    </div>
    
    <p>Hello,</p>
    
    <p>You have been invited to securely access files shared by Equinox Group Holdings.</p>
    
    <p>To ensure the security and confidentiality of our data, we require all external partners to review and accept our standard Terms of Use before access is granted.</p>
    
    <a href="${agreeLink}" class="btn">View & Accept Terms</a>
    
    <p>If you cannot click the button above, please copy and paste the following link into your browser:</p>
    <p style="word-break: break-all; font-size: 12px;"><a href="${agreeLink}">${agreeLink}</a></p>
    
    <div class="footer">
        <p>This is an automated security message. Please do not forward this email as the link is unique to your email address.</p>
        <p>&copy; ${new Date().getFullYear()} Equinox Group Holdings. All rights reserved.</p>
    </div>
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

        // Use responseType(ResponseType.RAW) to prevent the SDK from hanging while trying to parse the empty 202 Accepted body
        await client.api(`/users/${fromEmail}/sendMail`).responseType(ResponseType.RAW).post(message);

        return NextResponse.json({ success: true, share: newShare });
    } catch (e: any) {
        console.error("External Share POST Error:", e);
        return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
    }
}
