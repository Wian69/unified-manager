import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const chatId = searchParams.get('chatId');

    if (!userId && !chatId) {
        return NextResponse.json({ error: 'Missing userId or chatId' }, { status: 400 });
    }

    try {
        const client = getGraphClient();

        // SCENARIO 1: Fetch messages for a specific chat
        // SCENARIO 1: Fetch messages for a specific chat
        if (chatId) {
            // userId is needed for the user-relative endpoint which is more reliable for App permissions
            if (!userId) {
                return NextResponse.json({ error: 'userId required for message history' }, { status: 400 });
            }

            console.log(`[Teams API] Fetching messages for user ${userId} in chat ${chatId}`);
            try {
                // Using the user-relative endpoint often works better with App-only tokens
                const messagesResponse = await client.api(`/users/${userId}/chats/${chatId}/messages`)
                    .select('id,messageType,eventDetail,createdDateTime,from,body,attachments')
                    .top(50)
                    .get();
                
                console.log(`[Teams API] Received ${messagesResponse.value?.length || 0} messages for ${chatId}`);
                
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

                return NextResponse.json({ 
                    success: true, 
                    data: messages 
                });
            } catch (err: any) {
                console.error(`[Teams API] Failed to fetch messages for ${chatId}:`, err.message);
                return NextResponse.json({ 
                    error: 'Failed to fetch messages', 
                    details: err.message,
                    code: err.code
                }, { status: 500 });
            }
        }

        // SCENARIO 2: Fetch list of chats for a user (with external detection)
        const { searchParams: filterParams } = new URL(req.url);
        const sinceDate = filterParams.get('sinceDate');

        // 1. Fetch User Profile to get the internal domain
        let internalDomain = '';
        try {
            const userProfile = await client.api(`/users/${userId}`).select('userPrincipalName').get();
            internalDomain = userProfile.userPrincipalName.split('@')[1]?.toLowerCase();
        } catch (profileErr) {
            console.warn(`[Teams API] Failed to fetch profile for ${userId}, domain check may be less accurate.`);
        }

        // 2. Fetch User's Chats
        console.log(`[Teams API] Fetching chats for ${userId}, sinceDate: ${sinceDate}`);
        let chatsQuery = client.api(`/users/${userId}/chats`)
            .expand('lastMessagePreview')
            .top(50); // Reverted to 50 due to Graph API limits
        
        const chatsResponse = await chatsQuery.get();
        const chats = chatsResponse.value || [];
        console.log(`[Teams API] Found ${chats.length} total chats in Graph.`);

        const enrichedChats = [];

        for (const chat of chats) {
            try {
                // If sinceDate is provided, check lastMessage date
                if (sinceDate && chat.lastMessagePreview?.createdDateTime) {
                    const messageDate = new Date(chat.lastMessagePreview.createdDateTime);
                    const filterDate = new Date(sinceDate);
                    
                    if (messageDate < filterDate) {
                        continue; 
                    }
                }

                const membersResponse = await client.api(`/chats/${chat.id}/members`).get();
                const members = membersResponse.value || [];
                
                // Identify external members
                const externalMembers = members.filter((m: any) => {
                    const email = m.email || m.userId;
                    if (email) {
                        const domain = email.split('@')[1]?.toLowerCase();
                        return domain && domain !== internalDomain && !domain.includes('onmicrosoft.com');
                    }
                    return false;
                });

                // Ensure lastMessage has a consistent structure for the frontend
                let lastMessage = chat.lastMessagePreview || {};
                
                // If it's a meeting or the preview is generic/missing, try to get the last real message
                const previewText = lastMessage.body?.content?.toLowerCase() || '';
                if (!previewText || previewText.includes('system message') || chat.chatType === 'meeting') {
                    try {
                        const actualMessages = await client.api(`/chats/${chat.id}/messages`)
                            .top(1)
                            .get();
                        if (actualMessages.value && actualMessages.value[0]) {
                            lastMessage = actualMessages.value[0];
                        }
                    } catch (msgErr) {
                        // Fallback to what we have
                    }
                }

                if (!lastMessage.body || !lastMessage.body.content) {
                    lastMessage.body = { content: 'No recent messages or meeting details only' };
                }

                // Get chat name
                let topic = chat.topic;
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
                    lastMessage: lastMessage
                });
            } catch (err) {
                enrichedChats.push({ 
                    ...chat, 
                    topic: 'Protected Chat', 
                    isExternal: false,
                    lastMessage: { body: { content: 'Access restricted' } }
                });
            }
        }

        return NextResponse.json({ 
            success: true, 
            data: enrichedChats 
        });

    } catch (error: any) {
        console.error('[Teams API Error]:', error);
        return NextResponse.json({ 
            error: error.message,
            details: error.response?.data?.error?.message 
        }, { status: 500 });
    }
}
