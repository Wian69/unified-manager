import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

const DB_ROOT = process.cwd();
const DB_DIR = path.join(DB_ROOT, 'data');
const AGENTS_FILE = path.join(DB_DIR, 'agents.json');
const COMMANDS_FILE = path.join(DB_DIR, 'commands.json');
const WATCHLIST_FILE = path.join(DB_DIR, 'watchlist.json');
const RESULTS_FILE = path.join(DB_DIR, 'results.json');

const IS_PROD = process.env.KV_URL !== undefined;

async function ensureFileSync(file: string, initialData: any) {
    if (!fs.existsSync(file)) {
        if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(initialData, null, 2));
    }
}

async function initDB() {
    if (IS_PROD) return; // Vercel KV handles its own initialization
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
}

// Internal generic helpers
async function getData<T>(key: string, filePath: string, defaultValue: T): Promise<T> {
    if (IS_PROD) {
        const data = await kv.get<T>(key);
        return data || defaultValue;
    }
    await initDB();
    await ensureFileSync(filePath, defaultValue);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function saveData<T>(key: string, filePath: string, data: T): Promise<void> {
    if (IS_PROD) {
        await kv.set(key, data);
        return;
    }
    await initDB();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Public API
export async function getAgents() {
    return getData('agents', AGENTS_FILE, {});
}

export async function saveAgents(agents: any) {
    return saveData('agents', AGENTS_FILE, agents);
}

export async function getCommands() {
    return getData('commands', COMMANDS_FILE, []);
}

export async function saveCommands(commands: any) {
    return saveData('commands', COMMANDS_FILE, commands);
}

export async function getWatchlist() {
    return getData('watchlist', WATCHLIST_FILE, []);
}

export async function saveWatchlist(watchlist: any) {
    return saveData('watchlist', WATCHLIST_FILE, watchlist);
}

export async function getResults() {
    return getData('results', RESULTS_FILE, {});
}

export async function saveResults(results: any) {
    return saveData('results', RESULTS_FILE, results);
}
