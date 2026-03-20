import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    try {
        const client = getGraphClient();
        
        // 1. Fetch User Profile to get the internal domain
        const userProfile = await client.api(`/users/${userId}`).select('userPrincipalName').get();
        const internalDomain = userProfile.userPrincipalName.split('@')[1]?.toLowerCase();

        // 2. Fetch User's Chats
        const chatsResponse = await client.api(`/users/${userId}/chats`)
            .expand('lastMessagePreview')
            .top(20)
            .get();
        
        const chats = chatsResponse.value || [];
        const detailedChats = [];

        // 2. Process each chat to find members and identify external participants
        for (const chat of chats) {
            try {
                const membersResponse = await client.api(`/chats/${chat.id}/members`).get();
                const members = membersResponse.value || [];
                
                // Identify external members
                const externalMembers = members.filter((m: any) => {
                    // Check email domain if available
                    if (m.email) {
                        const domain = m.email.split('@')[1]?.toLowerCase();
                        return domain && domain !== internalDomain;
                    }
                    // For AAD users, check tenantId vs the system's tenant if possible
                    // But usually email is the most reliable cross-tenant indicator for users
                    return false;
                });

                // Get chat name (either topic or the other person's name)
                let chatName = chat.topic || "Unnamed Chat";
                if (!chat.topic && members.length === 2) {
                    const otherMember = members.find((m: any) => m.userId !== userId);
                    if (otherMember) chatName = otherMember.displayName;
                }

                detailedChats.push({
                    id: chat.id,
                    topic: chatName,
                    chatType: chat.chatType,
                    lastMessage: chat.lastMessagePreview,
                    membersCount: members.length,
                    isExternal: externalMembers.length > 0,
                    externalParticipants: externalMembers.map((m: any) => m.displayName)
                });
            } catch (chatErr: any) {
                console.error(`[API] Error processing chat ${chat.id}:`, chatErr.message);
            }
        }

        return NextResponse.json({
            data: detailedChats,
        });
    } catch (error: any) {
        console.error('[API] Teams Chat Error:', error.message);
        return NextResponse.json(
            { error: "Failed to fetch Teams chats", details: error.message },
            { status: 500 }
        );
    }
}
