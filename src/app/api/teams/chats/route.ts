import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const chatId = searchParams.get('chatId');
    const teamId = searchParams.get('teamId');
    const channelId = searchParams.get('channelId');

    if (!userId && !chatId && !teamId) {
        return NextResponse.json({ error: 'Missing userId, chatId or teamId' }, { status: 400 });
    }

    try {
        const client = getGraphClient();

        // SCENARIO 1: Fetch messages for a specific chat
        if (chatId) {
            const allMessages: any[] = [];
            let messagesResponse = await client.api(`/users/${userId}/chats/${chatId}/messages`)
                .top(50)
                .get();
            
            allMessages.push(...(messagesResponse.value || []).map((m: any) => ({
                ...m,
                isDeleted: !!m.deletedDateTime,
                // Add a flag if we should try to recover content
                needsRecovery: !!m.deletedDateTime && (!m.body?.content || m.body.content === '')
            })));

            while (messagesResponse['@odata.nextLink']) {
                messagesResponse = await client.api(messagesResponse['@odata.nextLink']).get();
                allMessages.push(...(messagesResponse.value || []));
            }
            
            return NextResponse.json({ success: true, data: allMessages });
        }

        // SCENARIO 2: Fetch messages for a specific Team Channel
        if (teamId && channelId) {
            const channelMessages = await client.api(`/teams/${teamId}/channels/${channelId}/messages`)
                .top(50)
                .get();

            return NextResponse.json({ 
                success: true, 
                data: (channelMessages.value || []).map((m: any) => ({
                    ...m,
                    isDeleted: !!m.deletedDateTime,
                    needsRecovery: !!m.deletedDateTime && (!m.body?.content || m.body.content === '')
                }))
            });
        }

        // SCENARIO 3: Fetch list of Chats AND Team Channels
        if (userId) {
            // A. Fetch Direct Chats
            const chatsResponse = await client.api(`/users/${userId}/chats`)
                .expand('lastMessagePreview')
                .top(50)
                .get();

            const chats = (chatsResponse.value || []).map((c: any) => ({
                ...c,
                type: 'chat',
                topic: c.topic || 'Private Chat',
                lastMessage: c.lastMessagePreview
            }));

            // B. Fetch Joined Teams & Channels
            const teamsResponse = await client.api(`/users/${userId}/joinedTeams`)
                .select('id,displayName,description')
                .get();

            const teams = teamsResponse.value || [];
            const channelEntries = [];

            for (const team of teams) {
                try {
                    const channels = await client.api(`/teams/${team.id}/channels`).get();
                    for (const channel of (channels.value || [])) {
                        channelEntries.push({
                            id: channel.id,
                            teamId: team.id,
                            topic: `${team.displayName} > ${channel.displayName}`,
                            chatType: 'channel',
                            type: 'channel',
                            description: channel.description,
                            lastMessage: null // Channel previews are harder to get in bulk
                        });
                    }
                } catch (e) {}
            }

            return NextResponse.json({ 
                success: true, 
                data: [...chats, ...channelEntries] 
            });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    } catch (error: any) {
        console.error('[Teams API Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
