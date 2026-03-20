import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const AGENTS_FILE = path.join(DB_DIR, 'agents.json');
const COMMANDS_FILE = path.join(DB_DIR, 'commands.json');
const WATCHLIST_FILE = path.join(DB_DIR, 'watchlist.json');

// Initialize DB files
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR);
}

const ensureFileSync = (file: string, initialData: any) => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(initialData, null, 2));
    }
};

ensureFileSync(AGENTS_FILE, {});
ensureFileSync(COMMANDS_FILE, []);
ensureFileSync(WATCHLIST_FILE, []);

export function getAgents() {
    return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf-8'));
}

export function saveAgents(agents: any) {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

export function getCommands() {
    return JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf-8'));
}

export function saveCommands(commands: any) {
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
}

export function getWatchlist() {
    if (!fs.existsSync(WATCHLIST_FILE)) return [];
    return JSON.parse(fs.readFileSync(WATCHLIST_FILE, 'utf-8'));
}

export function saveWatchlist(watchlist: any) {
    fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(watchlist, null, 2));
}
