"use client";

import { useEffect, useState } from "react";
import { HardDrive, RefreshCw, Search, FileText, Globe, User, ExternalLink, Hash, Clock, File, Activity } from "lucide-react";

export default function SharePointPage() {
    const [drives, setDrives] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Search states
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const fetchDrives = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sharepoint');
            const data = await res.json();
            if (data.drives) {
                setDrives(data.drives);
            }
        } catch (error) {
            console.error("Failed to fetch SharePoint drives", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        try {
            const res = await fetch(`/api/sharepoint/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setSearchResults(data.results || []);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        fetchDrives();
    }, []);

    const formatSize = (bytes: number) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-slate-900/60 p-8 rounded-3xl border border-slate-800/60 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-600/20 text-blue-500 rounded-2xl shadow-inner">
                        <HardDrive size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Enterprise Content</h1>
                        <p className="text-slate-400 font-medium">Unified SharePoint & OneDrive Management</p>
                    </div>
                </div>
                <button 
                    onClick={fetchDrives}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-xl transition-all border border-slate-700 font-bold active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    Sync Drives
                </button>
            </div>

            {/* Combined Global Search Section */}
            <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800/60 backdrop-blur-xl shadow-2xl">
                <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                    <Search className="text-blue-500" size={24} />
                    Global Document Search
                </h2>
                
                <form onSubmit={handleSearch} className="relative group">
                    <input 
                        type="text" 
                        placeholder="Search all Sites and Personal OneDrives (e.g. 'Contract', 'Financial', 'HR')..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950/80 border-2 border-slate-800/80 rounded-2xl py-5 pl-14 pr-32 text-white text-lg focus:outline-none focus:border-blue-500/50 transition-all font-medium placeholder:text-slate-600 shadow-inner"
                    />
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                        <Search size={22} />
                    </div>
                    <button 
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95"
                    >
                        {isSearching ? <RefreshCw className="animate-spin" size={16} /> : "Search All"}
                    </button>
                </form>

                {/* Search Results */}
                {hasSearched && (
                    <div className="mt-8 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                {isSearching ? "Searching Enterprise..." : `Found ${searchResults.length} Matches`}
                            </p>
                            {searchResults.length > 0 && (
                                <button onClick={() => setHasSearched(false)} className="text-xs text-blue-500 hover:underline font-bold">Clear Results</button>
                            )}
                        </div>

                        {searchResults.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {searchResults.map((res: any) => (
                                    <a 
                                        key={res.id} 
                                        href={res.webUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-5 bg-slate-950/40 border border-slate-800/60 rounded-2xl hover:bg-slate-800/40 hover:border-blue-500/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-5 min-w-0">
                                            <div className="p-3 bg-slate-900 text-slate-400 group-hover:text-blue-400 rounded-xl transition-colors">
                                                {res.type.includes('pdf') ? <FileText size={20} /> : <File size={20} />}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">{res.name}</h4>
                                                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">
                                                    <span className="flex items-center gap-1">
                                                        {res.siteName.includes('Site') ? <Globe size={10} className="text-emerald-500" /> : <User size={10} className="text-indigo-400" />}
                                                        {res.siteName}
                                                    </span>
                                                    <span className="flex items-center gap-1 border-l border-slate-800 pl-4">
                                                        <Hash size={10} />
                                                        {formatSize(res.size)}
                                                    </span>
                                                    <span className="flex items-center gap-1 border-l border-slate-800 pl-4">
                                                        <Clock size={10} />
                                                        {new Date(res.lastModified).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ExternalLink size={18} className="text-slate-700 group-hover:text-blue-500 transition-colors shrink-0" />
                                    </a>
                                ))}
                            </div>
                        ) : !isSearching && (
                            <div className="py-20 text-center bg-slate-950/20 rounded-3xl border border-dashed border-slate-800">
                                <Activity className="mx-auto text-slate-700 mb-4" size={48} />
                                <p className="text-slate-500 font-bold">No documents found matching "{searchQuery}"</p>
                                <p className="text-slate-600 text-xs mt-1">Try a different keyword or check your spelling.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Native Drives Section */}
            {!hasSearched && (
                <div className="space-y-6">
                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2">Root Document Libraries</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-48 bg-slate-900/20 animate-pulse rounded-3xl border border-slate-800/40" />
                            ))
                        ) : drives.length > 0 ? (
                            drives.map((d: any) => (
                                <div key={d.id} className="bg-slate-900/40 rounded-3xl border border-slate-800/60 p-8 backdrop-blur-md hover:border-blue-500/40 transition-all hover:shadow-2xl hover:shadow-blue-500/5 group">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="p-3 bg-slate-950/60 text-emerald-500 rounded-xl">
                                            <HardDrive size={24} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 bg-slate-950/60 px-3 py-1 rounded-full border border-slate-800 uppercase tracking-widest">Active Drive</span>
                                    </div>
                                    <h3 className="font-black text-lg text-white mb-2 w-full truncate" title={d.name}>{d.name}</h3>
                                    <p className="text-sm text-slate-400 mb-6 h-10 overflow-hidden font-medium line-clamp-2">{d.description || "Enterprise document repository accessible via Microsoft 365."}</p>
                                    <a href={d.webUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-slate-950/60 hover:bg-blue-600 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-800 hover:border-blue-500">
                                        Explore Drive <ExternalLink size={14} />
                                    </a>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                                <p className="text-slate-500 font-bold">No SharePoint drives detected in this tenant.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
