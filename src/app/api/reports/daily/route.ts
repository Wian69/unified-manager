import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';
import { getWatchlist } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    return generateReport();
}

export async function POST() {
    return generateReport();
}

async function generateReport() {
    console.log('[Report] Triggered Daily Intelligence Report');
    try {
        const watchlist = getWatchlist();
        console.log(`[Report] Watchlist size: ${watchlist?.length || 0}`);
        
        if (!watchlist || watchlist.length === 0) {
            console.log('[Report] Aborting: Watchlist is empty.');
            return NextResponse.json({ 
                success: false, 
                message: "Watchlist is empty. Add users to the watchlist before sending a report." 
            });
        }

        const client = getGraphClient();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const userReports = [];

        console.log('[Report] Aggregating telemetry for users...');
        for (const user of watchlist) {
            console.log(`[Report] -> Processing user: ${user.displayName} (${user.userPrincipalName})`);
            
            try {
                // 1. SharePoint Deletions (Search approach)
                const spRes = await client.api(`/users/${user.id}/drive/root/search(q='')`)
                    .select('id,name,size,lastModifiedDateTime')
                    .get();
                
                const recentDeletions = (spRes.value || []).filter((item: any) => 
                    new Date(item.lastModifiedDateTime) > new Date(oneDayAgo)
                );
                const totalSize = recentDeletions.reduce((acc: number, curr: any) => acc + (curr.size || 0), 0);

                // 2. Sent Emails Trace
                const mailRes = await client.api(`/users/${user.id}/mailFolders('sentitems')/messages`)
                    .select('subject,sentDateTime,bodyPreview,hasAttachments')
                    .top(24)
                    .orderby('sentDateTime desc')
                    .get();
                
                userReports.push({
                    user,
                    deletions: recentDeletions.length,
                    deletionSize: (totalSize / (1024 * 1024)).toFixed(2) + " MB",
                    emails: mailRes.value || [],
                    isHighRisk: recentDeletions.length > 50 || totalSize > 100 * 1024 * 1024
                });
            } catch (userErr: any) {
                console.error(`[Report] Error fetching data for ${user.userPrincipalName}:`, userErr.message);
                // Continue with other users
            }
        }

        const htmlBody = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #020617; color: #f8fafc; padding: 40px;">
                <div style="max-width: 800px; margin: 0 auto; background-color: #0f172a; border-radius: 24px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                    <div style="padding: 40px; border-bottom: 1px solid #1e293b; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.025em; color: #ffffff; text-transform: uppercase;">Daily Offboarding Intelligence</h1>
                        <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8; font-family: monospace; text-transform: uppercase; letter-spacing: 0.1em;">Security Snapshot • ${new Date().toLocaleDateString()}</p>
                    </div>

                    <div style="padding: 40px;">
                        ${userReports.map(report => `
                            <div style="margin-bottom: 40px; padding-bottom: 40px; border-bottom: 1px solid #1e293b;">
                                <div style="display: flex; align-items: center; justify-between: space-between; margin-bottom: 24px;">
                                    <div>
                                        <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #3b82f6;">${report.user.displayName}</h2>
                                        <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">${report.user.userPrincipalName}</p>
                                    </div>
                                    ${report.isHighRisk ? `
                                        <div style="padding: 4px 12px; background-color: #991b1b; color: #f8fafc; border-radius: 9999px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; margin-left: auto;">
                                            High Risk Detected
                                        </div>
                                    ` : ''}
                                </div>

                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                                    <div style="background-color: #1e293b; padding: 20px; border-radius: 16px;">
                                        <p style="margin: 0; font-size: 10px; color: #94a3b8; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">Recent Deletions (24h)</p>
                                        <p style="margin: 8px 0 0; font-size: 24px; font-weight: 800; color: #ffffff;">${report.deletions} Files</p>
                                    </div>
                                    <div style="background-color: #1e293b; padding: 20px; border-radius: 16px;">
                                        <p style="margin: 0; font-size: 10px; color: #94a3b8; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">Data Volume Moved</p>
                                        <p style="margin: 8px 0 0; font-size: 24px; font-weight: 800; color: #10b981;">${report.deletionSize}</p>
                                    </div>
                                </div>

                                <div style="background-color: #020617; border-radius: 16px; padding: 24px; border: 1px solid #1e293b;">
                                    <h3 style="margin: 0 0 16px; font-size: 14px; color: #3b82f6; font-weight: 800; text-transform: uppercase;">Sent Emails Trace (Last 24)</h3>
                                    ${report.emails.length === 0 ? '<p style="font-size: 12px; color: #475569;">No sent items recorded.</p>' : `
                                        <div>
                                            ${report.emails.map((mail: any) => `
                                                <div style="padding: 12px 0; border-bottom: 1px solid #1e293b;">
                                                    <div style="font-size: 14px; font-weight: 600; color: #e2e8f0;">${mail.subject || '(No Subject)'}</div>
                                                    <div style="font-size: 11px; color: #64748b;">${new Date(mail.sentDateTime).toLocaleString()}</div>
                                                    <div style="font-size: 11px; color: #475569; margin-top: 4px; font-style: italic;">${mail.bodyPreview}</div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    `}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="padding: 30px 40px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center;">
                        <p style="margin: 0; font-size: 11px; color: #475569; font-weight: 600;">UNIFIED MANAGER • AI SECURITY ENGINE</p>
                    </div>
                </div>
            </div>
        `;

        const senderEmail = 'itsupport@eqncs.com';
        console.log(`[Report] Dispatching email via sender: ${senderEmail}`);

        // 4. Send Email via Graph (using specific user as sender for Client Credentials)
        await client.api(`/users/${senderEmail}/sendMail`).post({
            message: {
                subject: `Offboarding Intelligence Report: ${userReports.length} Active Audits`,
                body: {
                    contentType: 'HTML',
                    content: htmlBody
                },
                toRecipients: [
                    { emailAddress: { address: senderEmail } }
                ]
            }
        });

        console.log('[Report] Successfully dispatched.');
        return NextResponse.json({ 
            success: true, 
            message: `Daily report sent to ${senderEmail} for ${userReports.length} users.`,
            details: userReports.map(r => ({ user: r.user.displayName, deletions: r.deletions }))
        });
    } catch (error: any) {
        console.error('[Report] Critical failure:', error.message);
        return NextResponse.json(
            { success: false, error: "Report failed", message: error.message },
            { status: 500 }
        );
    }
}
