import { NextResponse } from 'next/server';
import { getExternalShares, saveExternalShares } from '@/lib/db';
import { getGraphClient } from '@/lib/graph';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ error: 'Invalid or missing token' }, { status: 400 });
        }

        const shares = await getExternalShares();
        const shareIndex = shares.findIndex(s => s.id === token);

        if (shareIndex === -1) {
            return NextResponse.json({ error: 'Invitation not found or expired.' }, { status: 404 });
        }

        const share = shares[shareIndex];

        if (share.status === 'Accepted') {
            return NextResponse.json({ error: 'This invitation has already been accepted.' }, { status: 400 });
        }

        // Get IP for audit trail
        const forwardedFor = request.headers.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : 'Unknown';

        // Update DB
        shares[shareIndex] = {
            ...share,
            status: 'Accepted',
            acceptedAt: new Date().toISOString(),
            ipAddress: ip
        };

        await saveExternalShares(shares);

        // Call Graph API to send official B2B invitation
        const client = getGraphClient();
        const targetUrl = 'https://xxeqncs.sharepoint.com/teams/SharesForexternalusers/SitePages/CollabHome.aspx';

        try {
            await client.api('/invitations').post({
                invitedUserEmailAddress: share.email,
                inviteRedirectUrl: targetUrl,
                sendInvitationMessage: true,
                invitedUserMessageInfo: {
                    customizedMessageBody: "Thank you for accepting the Terms of Use. You now have access to the secure files."
                }
            });
        } catch (graphError: any) {
            console.error("Graph API B2B Invite Error:", graphError);
            // We still consider the agreement signed, but the backend invite failed
            // In a production scenario, we'd queue this or alert admin.
            throw new Error(`Failed to send Microsoft B2B Invitation: ${graphError.message}`);
        }

        return NextResponse.json({ success: true, redirectUrl: targetUrl });
    } catch (e: any) {
        console.error("Agreement POST Error:", e);
        return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
    }
}
