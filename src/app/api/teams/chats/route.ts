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
        if (chatId) {
            if (!userId) {
                return NextResponse.json({ error: 'userId required' }, { status: 400 });
            }

            try {
                // Using the user-relative endpoint for reliability
                const allMessages: any[] = [];
                let messagesResponse = await client.api(`/users/${userId}/chats/${chatId}/messages`)
                    .top(50)
                    .get();
                
                allMessages.push(...(messagesResponse.value || []));

                // Follow nextLink to get ALL messages
                while (messagesResponse['@odata.nextLink']) {
                    messagesResponse = await client.api(messagesResponse['@odata.nextLink']).get();
                    allMessages.push(...(messagesResponse.value || []));
                }
                
                return NextResponse.json({ 
                    success: true, 
                    data: allMessages 
                });
            } catch (err: any) {
                console.error(`[Teams API] History Error:`, err.message);
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        // SCENARIO 2: Fetch list of chats
        console.log(`[Teams API] Basic Listing for ${userId}`);
        const chatsResponse = await client.api(`/users/${userId}/chats`)
            .expand('lastMessagePreview')
            .top(50)
            .get();

        const chats = chatsResponse.value || [];
        const enrichedChats = [];

        for (const chat of chats) {
            try {
                // Get members safely
                const membersResponse = await client.api(`/chats/${chat.id}/members`).get();
                const members = membersResponse.value || [];
                
                // Simplified Topic
                let topic = chat.topic;
                if (!topic) {
                    const otherMember = members.find((m: any) => m.userId !== userId);
                    topic = otherMember ? otherMember.displayName : 'Private Chat';
                }

                enrichedChats.push({
                    ...chat,
                    topic,
                    isExternal: false, // Default to false for now to ensure visibility
                    membersCount: members.length,
                    lastMessage: chat.lastMessagePreview
                });
            } catch (err) {
                enrichedChats.push({ ...chat, topic: 'Protected Chat' });
            }
        }

        return NextResponse.json({ 
            success: true, 
            data: enrichedChats 
        });

    } catch (error: any) {
        console.error('[Teams API Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
