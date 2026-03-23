import fs from 'fs';
import path from 'path';

const DB_ROOT = process.cwd();
const DB_DIR = path.join(DB_ROOT, 'data');
const AGENTS_FILE = path.join(DB_DIR, 'agents.json');
const COMMANDS_FILE = path.join(DB_DIR, 'commands.json');
const WATCHLIST_FILE = path.join(DB_DIR, 'watchlist.json');
const RESULTS_FILE = path.join(DB_DIR, 'results.json');

const ensureFileSync = (file: string, initialData: any) => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(initialData, null, 2));
    }
};

let isInitialized = false;

function initDB() {
    if (isInitialized) return;
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
    ensureFileSync(AGENTS_FILE, {});
    ensureFileSync(COMMANDS_FILE, []);
    ensureFileSync(WATCHLIST_FILE, []);
    ensureFileSync(RESULTS_FILE, {});
    isInitialized = true;
}

export function getAgents() {
    initDB();
    return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf-8'));
}

export function saveAgents(agents: any) {
    initDB();
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

export function getCommands() {
    initDB();
    return JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf-8'));
}

export function saveCommands(commands: any) {
    initDB();
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
}

export function getWatchlist() {
    initDB();
    if (!fs.existsSync(WATCHLIST_FILE)) return [];
    return JSON.parse(fs.readFileSync(WATCHLIST_FILE, 'utf-8'));
}

export function saveWatchlist(watchlist: any) {
    initDB();
    fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(watchlist, null, 2));
}

export function getResults() {
    initDB();
    if (!fs.existsSync(RESULTS_FILE)) return {};
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
}

export function saveResults(results: any) {
    initDB();
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}
