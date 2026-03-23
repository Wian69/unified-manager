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
const IS_VERCEL = process.env.VERCEL === '1';

async function ensureFileSync(file: string, initialData: any) {
    if (IS_VERCEL && !IS_PROD) {
        console.warn(`[DB] Warning: Running on Vercel without KV_URL. Filesystem is read-only.`);
        return;
    }
    if (!fs.existsSync(file)) {
        if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(initialData, null, 2));
    }
}

async function initDB() {
    if (IS_PROD) return; // Vercel KV handles its own initialization
    if (IS_VERCEL) return; // Cannot create directories on Vercel FS
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
}

// Internal generic helpers
async function getData<T>(key: string, filePath: string, defaultValue: T): Promise<T> {
    if (IS_PROD) {
        try {
            const data = await kv.get<T>(key);
            return data || defaultValue;
        } catch (err: any) {
            console.error(`[DB] Vercel KV Get Error (${key}):`, err.message);
            throw new Error(`Cloud Database Error: Please ensure Vercel KV is connected and KV_URL is set. Original: ${err.message}`);
        }
    }
    if (IS_VERCEL) {
        console.warn(`[DB] Warning: No KV_URL on Vercel. Returning default for ${key}`);
        return defaultValue;
    }
    await initDB();
    await ensureFileSync(filePath, defaultValue);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function saveData<T>(key: string, filePath: string, data: T): Promise<void> {
    if (IS_PROD) {
        try {
            await kv.set(key, data);
            return;
        } catch (err: any) {
            console.error(`[DB] Vercel KV Save Error (${key}):`, err.message);
            throw new Error(`Cloud Database Error: Please ensure Vercel KV is connected and KV_URL is set. Original: ${err.message}`);
        }
    }
    if (IS_VERCEL) {
        console.error(`[DB] ERROR: Cannot save ${key} - No Vercel KV connected and FS is read-only.`);
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
