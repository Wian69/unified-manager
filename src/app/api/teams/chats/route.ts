import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const chatId = searchParams.get('chatId');
    const sinceDate = searchParams.get('sinceDate');

    if (!userId && !chatId) {
        return NextResponse.json({ error: 'Missing userId or chatId' }, { status: 400 });
    }

    try {
        const client = getGraphClient();

        // SCENARIO 1: Fetch messages for a specific chat
        if (chatId) {
            if (!userId) {
                return NextResponse.json({ error: 'userId required' }, { status: 400 });
            }

            try {
                // Use a simpler endpoint if the specific one fails
                const messagesResponse = await client.api(`/users/${userId}/chats/${chatId}/messages`)
                    .select('id,messageType,eventDetail,createdDateTime,from,body,attachments')
                    .top(50)
                    .get();
                
                const messages = (messagesResponse.value || []).map((msg: any) => {
                    if (msg.messageType === 'system' && !msg.body?.content && msg.eventDetail) {
                        let content = 'System Event';
                        const detail = msg.eventDetail;
                        if (detail['@odata.type']) {
                            const type = detail['@odata.type'].split('.').pop();
                            content = type.replace('EventMessageDetail', '').replace(/([A-Z])/g, ' $1').trim();
                        }
                        return { ...msg, body: { content: `<i>${content}</i>` } };
                    }
                    return msg;
                });

                return NextResponse.json({ success: true, data: messages });
            } catch (err: any) {
                console.error(`[Teams API] History Error for ${chatId}:`, err.message);
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        // SCENARIO 2: Fetch list of chats
        let internalDomain = '';
        try {
            const userProfile = await client.api(`/users/${userId}`).select('userPrincipalName').get();
            internalDomain = userProfile.userPrincipalName.split('@')[1]?.toLowerCase();
        } catch (profileErr) {
            console.warn(`[Teams API] Profile Fetch Error:`, profileErr);
        }

        // Fetching without expansion first to be safe
        console.log(`[Teams API] Listing chats for ${userId}`);
        const chatsResponse = await client.api(`/users/${userId}/chats`)
            .top(50)
            .get();

        const chats = chatsResponse.value || [];
        const enrichedChats = [];

        for (const chat of chats) {
            let topic = chat.topic;
            let lastMessage: any = { body: { content: 'No preview available' }, createdDateTime: '1970-01-01T00:00:00Z' };
            let isExternal = false;
            let externalParticipants: string[] = [];
            let membersCount = 0;

            try {
                // Check if we should filter by date (but don't 'continue' yet, just flag it)
                // We'll try to get the last message anyway
                const msgsRes = await client.api(`/users/${userId}/chats/${chat.id}/messages`).top(1).get();
                if (msgsRes.value && msgsRes.value[0]) {
                    lastMessage = msgsRes.value[0];
                    
                    if (sinceDate && lastMessage['createdDateTime']) {
                        const messageDate = new Date(lastMessage['createdDateTime'] as string);
                        const filterDate = new Date(sinceDate);
                        if (messageDate < filterDate) {
                            // SKIP OLD CHATS IF FILTER IS ACTIVE
                            continue;
                        }
                    }
                }

                // Get members for external detection and topic
                const membersResponse = await client.api(`/chats/${chat.id}/members`).get();
                const members = membersResponse.value || [];
                membersCount = members.length;
                
                // External detection
                const externalMembers = members.filter((m: any) => {
                    const u = m.email || m.userId || '';
                    if (u.includes('@')) {
                        const domain = u.split('@')[1]?.toLowerCase();
                        return domain && domain !== internalDomain && !domain.includes('onmicrosoft.com');
                    }
                    return false;
                });
                isExternal = externalMembers.length > 0;
                externalParticipants = externalMembers.map((m: any) => m.email || m.displayName || 'Unknown External');

                if (!topic) {
                    // Try to find a member that isn't the current user
                    const otherMember = members.find((m: any) => {
                        const mId = (m.userId || '').toLowerCase();
                        const mEmail = (m.email || '').toLowerCase();
                        const searchId = (userId || '').toLowerCase();
                        return mId !== searchId && mEmail !== searchId;
                    });
                    topic = otherMember ? otherMember.displayName : 'Teams Chat';
                }

                enrichedChats.push({
                    ...chat,
                    topic: topic || 'Teams Conversation',
                    isExternal,
                    externalParticipants,
                    membersCount,
                    lastMessage
                });
            } catch (err) {
                // Fallback for restricted/private chats
                enrichedChats.push({
                    ...chat,
                    topic: topic || 'Private/Restricted Chat',
                    isExternal: false,
                    lastMessage: { body: { content: 'Content hidden or restricted' } }
                });
            }
        }

        return NextResponse.json({ success: true, data: enrichedChats });

    } catch (error: any) {
        console.error('[Teams API Critical Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
