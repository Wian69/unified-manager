"use client";

import { useState, useEffect } from "react";
import { Search, AlertTriangle, CheckCircle2, RefreshCw, UserX } from "lucide-react";

export default function FinalRemovalPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [removalComplete, setRemovalComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length > 2) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSearch = async () => {
        setSearching(true);
        try {
            const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            const sorted = (data.users || []).sort((a: any, b: any) => (a.displayName || "").localeCompare(b.displayName || ""));
            setSearchResults(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    const handleExecuteRemoval = async () => {
        if (!selectedUser) return;
        
        const confirmDelete = window.confirm(
            `WARNING: You are about to permanently execute Final Removal for ${selectedUser.displayName}.\n\nThis will instantly revoke their sessions, disable their account, remove them from all groups, and strip their licenses.\n\nAre you absolutely sure you want to proceed?`
        );

        if (!confirmDelete) return;

        setIsRemoving(true);
        setError(null);
        setRemovalComplete(false);

        try {
            const res = await fetch("/api/users/final-removal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser.id })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to execute removal");
            }

            setRemovalComplete(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsRemoving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 mt-10">
            <div className="bg-slate-900/80 backdrop-blur-xl p-10 rounded-3xl border border-rose-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 via-orange-500 to-rose-600"></div>
                
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                        <UserX size={32} className="text-rose-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Final Removal All</h1>
                        <p className="text-slate-400 mt-1 font-mono text-sm">Securely disable accounts, strip groups, and remove licenses.</p>
                    </div>
                </div>

                {!selectedUser ? (
                    <div className="space-y-4">
                        <label className="text-sm font-bold uppercase tracking-widest text-slate-500">Search for an employee to remove</label>
                        <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-xl focus-within:border-rose-500/50 transition-colors">
                            <Search className="ml-4 text-slate-500" size={24} />
                            <input 
                                type="text" 
                                placeholder="Search by name or email..." 
                                className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-4 text-lg font-medium placeholder:text-slate-600 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <RefreshCw className="animate-spin text-rose-500" size={20} />
                                </div>
                            )}
                        </div>

                        {searchResults.length > 0 && (
                            <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60 shadow-xl">
                                {searchResults.map(u => (
                                    <div 
                                        key={u.id} 
                                        className="flex items-center justify-between p-4 hover:bg-slate-900 cursor-pointer transition-colors"
                                        onClick={() => {
                                            setSelectedUser(u);
                                            setSearchResults([]);
                                            setSearchQuery("");
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-bold">
                                                {u.displayName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200">{u.displayName}</div>
                                                <div className="text-xs text-slate-500 font-mono">{u.userPrincipalName}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-rose-500 px-3 py-1 bg-rose-500/10 rounded-lg">
                                            Select
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-black text-2xl border-4 border-slate-900 shadow-xl">
                                    {selectedUser.displayName.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">{selectedUser.displayName}</h2>
                                    <p className="text-slate-400 font-mono">{selectedUser.userPrincipalName}</p>
                                    <p className="text-slate-500 text-sm mt-1">ID: {selectedUser.id}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setSelectedUser(null);
                                    setRemovalComplete(false);
                                    setError(null);
                                }}
                                className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                            >
                                Cancel / Select Another
                            </button>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3">
                                <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="text-rose-500 font-bold text-sm">Removal Failed</h3>
                                    <p className="text-rose-400/80 text-xs mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        {removalComplete && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 flex items-start gap-4">
                                <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={28} />
                                <div>
                                    <h3 className="text-emerald-500 font-black text-lg">Final Removal Complete!</h3>
                                    <p className="text-emerald-400/80 text-sm mt-1 mb-4">
                                        The user's sessions have been revoked, their account is disabled, they have been stripped from all groups, and their licenses have been removed.
                                    </p>
                                    <button 
                                        onClick={() => {
                                            setSelectedUser(null);
                                            setRemovalComplete(false);
                                        }}
                                        className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                                    >
                                        Remove Another User
                                    </button>
                                </div>
                            </div>
                        )}

                        {!removalComplete && (
                            <div className="pt-4 border-t border-slate-800/60">
                                <button 
                                    onClick={handleExecuteRemoval}
                                    disabled={isRemoving}
                                    className="w-full flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white p-5 rounded-xl font-black text-lg shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isRemoving ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={24} />
                                            Executing Removal Sequence...
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle size={24} />
                                            EXECUTE FINAL REMOVAL
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-rose-500/60 text-xs mt-4 font-bold uppercase tracking-widest">
                                    Warning: This action cannot be undone
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
