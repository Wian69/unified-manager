const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --- Configuration ---
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}`;
const ENV_PATH = path.join(__dirname, '..', '.env.local');
const TOKEN_PATH = path.join(__dirname, '..', '.teams_token');

function getEnv() {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) env[parts[0].trim()] = parts[1].trim();
    });
    return env;
}

const config = getEnv();
const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = config;

if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID) {
    console.error('Error: AZURE_TENANT_ID or AZURE_CLIENT_ID missing in .env.local');
    process.exit(1);
}

// 1. Create Server to capture the code
const server = http.createServer(async (req, res) => {
    const query = url.parse(req.url, true).query;

    if (query.code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Login Successful!</h1><p>You can close this window now. The script is processing your token...</p>');
        
        console.log('Code received. Fetching token...');
        try {
            const tokenResponse = await fetchToken(query.code);
            if (tokenResponse.refresh_token) {
                fs.writeFileSync(TOKEN_PATH, tokenResponse.refresh_token);
                console.log('Success! Token saved to .teams_token');
                process.exit(0);
            } else {
                console.error('Error: No refresh token received.');
                process.exit(1);
            }
        } catch (err) {
            console.error('Token Fetch Error:', err.message);
            process.exit(1);
        }
    } else {
        res.writeHead(404);
        res.end();
    }
});

async function fetchToken(code) {
    const body = new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'Presence.ReadWrite offline_access User.Read'
    });

    const response = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    return await response.json();
}

server.listen(PORT, () => {
    const authUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize?client_id=${AZURE_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_mode=query&scope=${encodeURIComponent('Presence.ReadWrite offline_access User.Read')}`;
    
    console.log('--- Teams Login Helper ---');
    console.log('Opening browser for login...');
    console.log('If it doesn\'t open, go to:', authUrl);

    // Open browser (Windows specific)
    exec(`start "" "${authUrl}"`);
});
