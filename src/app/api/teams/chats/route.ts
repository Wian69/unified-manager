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
            const messagesResponse = await client.api(`/chats/${chatId}/messages`)
                .top(20)
                .get();
            
            return NextResponse.json({ 
                success: true, 
                data: messagesResponse.value || [] 
            });
        }

        // SCENARIO 2: Fetch list of chats for a user (with external detection)
        // 1. Fetch User Profile to get the internal domain
        const userProfile = await client.api(`/users/${userId}`).select('userPrincipalName').get();
        const internalDomain = userProfile.userPrincipalName.split('@')[1]?.toLowerCase();

        // 2. Fetch User's Chats
        const chatsResponse = await client.api(`/users/${userId}/chats`)
            .expand('lastMessagePreview')
            .top(20)
            .get();

        const chats = chatsResponse.value || [];
        const enrichedChats = [];

        for (const chat of chats) {
            try {
                const membersResponse = await client.api(`/chats/${chat.id}/members`).get();
                const members = membersResponse.value || [];
                
                // Identify external members
                const externalMembers = members.filter((m: any) => {
                    if (m.email) {
                        const domain = m.email.split('@')[1]?.toLowerCase();
                        return domain && domain !== internalDomain;
                    }
                    return false;
                });

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
                    externalParticipants: externalMembers.map((m: any) => m.email),
                    membersCount: members.length,
                    lastMessage: chat.lastMessagePreview
                });
            } catch (err) {
                enrichedChats.push({ ...chat, topic: 'Protected Chat', isExternal: false });
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
