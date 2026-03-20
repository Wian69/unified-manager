"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UserMinus, ShieldAlert, FileText, Activity, RefreshCw, Search, ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import ActivityCard from "@/components/ActivityCard";
import SharePointDeletionsModule from "@/components/SharePointDeletionsModule";

export default function OffboardingPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-4">
                <RefreshCw size={40} className="animate-spin text-blue-500" />
                <p className="font-mono text-sm uppercase tracking-widest">Initialising Offboarding Monitor...</p>
            </div>
        }>
            <OffboardingContent />
        </Suspense>
    );
}

function OffboardingContent() {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Unified Monitoring State
    const [monitoredUsers, setMonitoredUsers] = useState<any[]>([]);
    const [globalSearchQuery, setGlobalSearchQuery] = useState("");
    const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
    const [searchingGlobal, setSearchingGlobal] = useState(false);

    // Live Auto-Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (globalSearchQuery.length > 2) {
                handleGlobalSearch();
            } else {
                setGlobalSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [globalSearchQuery]);

    const handleGlobalSearch = async () => {
        setSearchingGlobal(true);
        try {
            const res = await fetch(`/api/users?search=${encodeURIComponent(globalSearchQuery)}`);
            const data = await res.json();
            setGlobalSearchResults(data.users || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchingGlobal(false);
        }
    };

    const addToWatchlist = (user: any) => {
        if (!monitoredUsers.find(u => u.id === user.id)) {
            setMonitoredUsers(prev => [...prev, user]);
        }
        setGlobalSearchResults([]);
        setGlobalSearchQuery(""); // Clear on add
    };

    const removeFromWatchlist = (userId: string) => {
        setMonitoredUsers(prev => prev.filter(u => u.id !== userId));
    };

    const fetchOffboardingAgents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/agent/list');
            const data = await res.json();
            setAgents(data.agents || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffboardingAgents();
    }, []);

    const searchParams = useSearchParams();
    const directUser = searchParams.get('user');

    useEffect(() => {
        if (directUser && agents.length > 0) {
            // Find the agent with this UPN or just audit the UPN directly
            // This logic is now removed as the audit section is gone.
            // Keeping the useEffect for now, but it will be empty.
        }
    }, [directUser, agents.length]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Unified User Search Header */}
            <div className="bg-slate-950/50 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none rounded-[2.5rem]" />
                <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-3">
                            Offboarding <span className="text-blue-500">Monitor</span>
                        </h1>
                        <p className="text-slate-400 max-w-lg mx-auto italic">Start typing to find an employee...</p>
                    </div>

                    <div className="w-full max-w-2xl relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl">
                            <Search className="ml-4 text-slate-500" size={24} />
                            <input 
                                type="text" 
                                placeholder="Search employee name..." 
                                className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-4 text-lg font-medium placeholder:text-slate-600"
                                value={globalSearchQuery}
                                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                            />
                            {searchingGlobal && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <RefreshCw className="animate-spin text-blue-500" size={20} />
                                </div>
                            )}
                        </div>

                        {globalSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-3xl z-50 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200 divide-y divide-slate-800">
                                {globalSearchResults.map(u => (
                                    <button 
                                        key={u.id} 
                                        onClick={() => addToWatchlist(u)}
                                        className="flex items-center justify-between p-4 hover:bg-blue-500/10 rounded-xl transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/20 transition-all font-bold">
                                                {u.displayName.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-slate-100 group-hover:text-white">{u.displayName}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{u.userPrincipalName}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                            Add to Watchlist
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 overflow-hidden backdrop-blur-md">
                <div className="p-6 border-b border-slate-800/60 flex justify-between items-center bg-slate-950/30">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldAlert size={20} className="text-rose-500" />
                        Employee Watchlist ({monitoredUsers.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950/50 text-slate-400 uppercase font-black text-[10px] tracking-widest border-b border-slate-800/60">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4 text-center">Device Status</th>
                                <th className="px-6 py-4 text-center">Data Activity</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {monitoredUsers.length > 0 ? (
                                monitoredUsers.map(u => {
                                    const agent = agents.find(a => 
                                        a.userPrincipalName?.toLowerCase() === u.userPrincipalName?.toLowerCase() ||
                                        a.userDisplayName?.toLowerCase() === u.displayName?.toLowerCase() ||
                                        a.deviceName?.toLowerCase() === u.displayName?.toLowerCase()
                                    );
                                    return (
                                        <tr 
                                            key={u.id} 
                                            className="hover:bg-blue-500/5 cursor-pointer transition-all group"
                                            onClick={() => window.location.href = `/offboarding/${u.id}`}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400">
                                                        {u.displayName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{u.displayName}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono italic">{u.userPrincipalName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {agent ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                                                        <Activity size={10} className="animate-pulse" />
                                                        {agent.deviceName}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600 text-[10px] italic">No Device Found</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 rounded-full text-rose-400 text-[10px] font-bold uppercase tracking-wider border border-rose-500/20">
                                                    High Density
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); removeFromWatchlist(u.id); }}
                                                        className="text-slate-600 hover:text-rose-500 p-2 transition-colors hover:bg-rose-500/10 rounded-lg"
                                                        title="Remove"
                                                    >
                                                        <UserMinus size={16} />
                                                    </button>
                                                    <button 
                                                        className="text-slate-600 hover:text-blue-400 p-2 transition-colors hover:bg-blue-500/10 rounded-lg"
                                                        title="Deep Audit"
                                                    >
                                                        <ArrowLeft size={16} className="rotate-180" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-500">
                                    <UserMinus className="mx-auto mb-4 opacity-20" size={48} />
                                    <p className="font-mono text-xs uppercase tracking-widest text-slate-600">No employees in watchlist. Use search to add.</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
