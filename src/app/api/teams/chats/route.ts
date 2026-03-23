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
            .top(50); // Increased top to find more potential matches
        
        const chatsResponse = await chatsQuery.get();
        const chats = chatsResponse.value || [];
        console.log(`[Teams API] Found ${chats.length} total chats in Graph`);

        const enrichedChats = [];

        for (const chat of chats) {
            try {
                // If sinceDate is provided, check lastMessage date
                if (sinceDate && chat.lastMessagePreview?.createdDateTime) {
                    const messageDate = new Date(chat.lastMessagePreview.createdDateTime);
                    const filterDate = new Date(sinceDate);
                    
                    if (messageDate < filterDate) {
                        // console.log(`[Teams API] Skipping old chat: ${chat.id} (${messageDate.toISOString()} < ${filterDate.toISOString()})`);
                        continue; 
                    }
                }

                const membersResponse = await client.api(`/chats/${chat.id}/members`).get();
                const members = membersResponse.value || [];
                
                // Identify external members using both email and UPN
                const externalMembers = members.filter((m: any) => {
                    const email = m.email || m.userId; // userId in members might be the UPN for external users
                    if (email) {
                        const domain = email.split('@')[1]?.toLowerCase();
                        // If domain exists and doesn't match internal domain or common tenant variations
                        return domain && domain !== internalDomain && !domain.includes('onmicrosoft.com');
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
                    externalParticipants: externalMembers.map((m: any) => m.email || m.displayName),
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
