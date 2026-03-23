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
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        // SCENARIO 2: Fetch list of chats
        let internalDomain = '';
        try {
            const userProfile = await client.api(`/users/${userId}`).select('userPrincipalName').get();
            internalDomain = userProfile.userPrincipalName.split('@')[1]?.toLowerCase();
        } catch (profileErr) {
            console.warn(`[Teams API] Failed to fetch profile for ${userId}`);
        }

        const chatsResponse = await client.api(`/users/${userId}/chats`)
            .expand('lastMessagePreview')
            .top(50)
            .get();

        const chats = chatsResponse.value || [];
        const enrichedChats = [];

        for (const chat of chats) {
            let topic = chat.topic;
            try {
                // Date filtering
                if (sinceDate && chat.lastMessagePreview?.createdDateTime) {
                    const messageDate = new Date(chat.lastMessagePreview.createdDateTime);
                    const filterDate = new Date(sinceDate);
                    if (messageDate < filterDate) continue;
                }

                const membersResponse = await client.api(`/chats/${chat.id}/members`).get();
                const members = membersResponse.value || [];
                
                // External detection
                const externalMembers = members.filter((m: any) => {
                    const email = m.email || m.userId;
                    if (email && email.includes('@')) {
                        const domain = email.split('@')[1]?.toLowerCase();
                        return domain && domain !== internalDomain && !domain.includes('onmicrosoft.com');
                    }
                    return false;
                });

                if (!topic) {
                    const otherMember = members.find((m: any) => m.userId !== userId);
                    topic = otherMember ? otherMember.displayName : 'Private Chat';
                }

                enrichedChats.push({
                    ...chat,
                    topic,
                    isExternal: externalMembers.length > 0,
                    externalParticipants: externalMembers.map((m: any) => m.email || m.displayName),
                    membersCount: members.length,
                    lastMessage: chat.lastMessagePreview
                });
            } catch (err) {
                enrichedChats.push({ ...chat, topic: topic || 'Protected Chat', isExternal: false });
            }
        }

        return NextResponse.json({ success: true, data: enrichedChats });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
