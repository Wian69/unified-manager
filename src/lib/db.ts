import fs from 'fs';
import path from 'path';
import { createClient } from '@vercel/kv';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const DB_ROOT = process.cwd();
const DB_DIR = path.join(DB_ROOT, 'data');
const AGENTS_FILE = path.join(DB_DIR, 'agents.json');
const COMMANDS_FILE = path.join(DB_DIR, 'commands.json');
const WATCHLIST_FILE = path.join(DB_DIR, 'watchlist.json');
const RESULTS_FILE = path.join(DB_DIR, 'results.json');

// 1. Vercel KV Config
const rawUrl = process.env.STORAGE_URL || process.env.KV_REST_API_URL || process.env.KV_URL || "";
const KV_URL = rawUrl.startsWith('https://') ? rawUrl : undefined;
const KV_REST_API_TOKEN = process.env.STORAGE_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;
const IS_KV = KV_URL !== undefined && KV_REST_API_TOKEN !== undefined;

// 2. Supabase Config
const rawSupabaseUrl = process.env.SUPABASE_URL || "";
const SUPABASE_URL = rawSupabaseUrl.startsWith('https://') ? rawSupabaseUrl : undefined;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const IS_SUPABASE = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

const IS_PROD = IS_KV || IS_SUPABASE;
const IS_VERCEL = process.env.VERCEL === '1';

let kv: ReturnType<typeof createClient> | null = null;
if (IS_KV) {
    try {
        kv = createClient({ url: KV_URL!, token: KV_REST_API_TOKEN! });
    } catch (err: any) { console.error(`[DB] KV Init Error: ${err.message}`); }
}

let supabase: any = null;
if (IS_SUPABASE) {
    try {
        supabase = createSupabaseClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    } catch (err: any) { console.error(`[DB] Supabase Init Error: ${err.message}`); }
}

// Zero-Config Volatile Memory (for when no DB is linked)
const memoryStore: Record<string, any> = {
    agents: {},
    commands: [],
    watchlist: [],
    results: {}
};

async function ensureFileSync(file: string, initialData: any) {
    if (IS_VERCEL && !IS_PROD) {
        // Use memoryStore if we are on Vercel without KV
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
    if (IS_SUPABASE && supabase) {
        try {
            const { data, error } = await supabase.from('kv').select('value').eq('key', key).maybeSingle();
            if (error) throw error;
            return data?.value || defaultValue;
        } catch (err: any) {
            console.error(`[DB] Supabase Get Error (${key}):`, err.message);
            // Fallback to KV or logic below if Supabase is misconfigured or table missing
        }
    }
    if (IS_KV && kv) {
        try {
            const data = await kv.get<T>(key);
            return data || defaultValue;
        } catch (err: any) {
            console.error(`[DB] Vercel KV Get Error (${key}):`, err.message);
        }
    }
    if (IS_VERCEL) {
        return (memoryStore as any)[key] || defaultValue;
    }
    await initDB();
    await ensureFileSync(filePath, defaultValue);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function saveData<T>(key: string, filePath: string, data: T): Promise<void> {
    if (IS_SUPABASE && supabase) {
        try {
            const { error } = await supabase.from('kv').upsert({ key, value: data }, { onConflict: 'key' });
            if (error) throw error;
            return;
        } catch (err: any) {
            console.error(`[DB] Supabase Save Error (${key}):`, err.message);
        }
    }
    if (IS_KV && kv) {
        try {
            await kv.set(key, data);
            return;
        } catch (err: any) {
            console.error(`[DB] Vercel KV Save Error (${key}):`, err.message);
        }
    }
    if (IS_VERCEL) {
        (memoryStore as any)[key] = data;
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
