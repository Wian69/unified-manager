import { getGraphClient } from './src/lib/graph';

async function test() {
    try {
        const client = getGraphClient();
        console.log("Fetching users...");
        const users = await client.api('/users').top(1).get();
        const userId = users.value[0].id;
        console.log(`Testing with user: ${userId}`);

        console.log("Fetching chats...");
        const chats = await client.api(`/users/${userId}/chats`).top(5).get();
        console.log(`Found ${chats.value?.length || 0} chats.`);
        
        if (chats.value && chats.value.length > 0) {
            const chatId = chats.value[0].id;
            console.log(`Fetching messages for chat: ${chatId}`);
            const messages = await client.api(`/users/${userId}/chats/${chatId}/messages`).top(10).get();
            console.log(`Found ${messages.value?.length || 0} messages.`);
        }
    } catch (e: any) {
        console.error("GRAPH ERROR:", e.message);
        console.error(e);
    }
}

test();
