async function test() {
    console.log("Testing API endpoint...");
    try {
        const res = await fetch('http://localhost:3000/api/mail/copy-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sourceUser: 'jan.reyneke@eqncs.com',
                targetUser: 'jan.reyneke@partner.eqncs.com',
                sourceFolderIds: ['dummy'], // Just to trigger it
                recursive: false
            })
        });

        console.log("Status:", res.status);
        console.log("Headers:", Object.fromEntries(res.headers.entries()));

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No stream');

        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value);
            console.log("Stream Chunk:", text);
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}
test();
