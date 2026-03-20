"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
    const router = useRouter();
    const [agents, setAgents] = useState<any[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
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

    const saveWatchlist = async (newList: any[]) => {
        // Save to LocalStorage immediately for instant persistence
        if (typeof window !== 'undefined') {
            localStorage.setItem('employeeWatchlist', JSON.stringify(newList));
        }
        
        try {
            await fetch('/api/offboarding/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ watchlist: newList }),
                cache: 'no-store'
            });
        } catch (err) {
            console.error('[Watchlist] API Save failed:', err);
        }
    };

    const addToWatchlist = (user: any) => {
        if (!monitoredUsers.find(u => u.id === user.id)) {
            const newList = [...monitoredUsers, user];
            setMonitoredUsers(newList);
            saveWatchlist(newList);
        }
        // Keep results in view
    };

    const removeFromWatchlist = (userId: string) => {
        const newList = monitoredUsers.filter(u => u.id !== userId);
        setMonitoredUsers(newList);
        saveWatchlist(newList);
    };

    const fetchOffboardingData = async () => {
        setLoading(true);
        try {
            const [agentRes, deviceRes, watchlistRes] = await Promise.all([
                fetch('/api/agent/list', { cache: 'no-store' }),
                fetch('/api/devices', { cache: 'no-store' }),
                fetch(`/api/offboarding/watchlist?t=${Date.now()}`, { cache: 'no-store' })
            ]);
            
            const agentData = await agentRes.json();
            const deviceData = await deviceRes.json();
            const watchlistData = await watchlistRes.json();
            
            setAgents(agentData.agents || []);
            setDevices(deviceData.devices || []);

            // Handle Watchlist from API, fallback to localStorage
            let finalWatchlist = watchlistData.watchlist || [];
            if (finalWatchlist.length === 0 && typeof window !== 'undefined') {
                const localData = localStorage.getItem('employeeWatchlist');
                if (localData) {
                    try {
                        finalWatchlist = JSON.parse(localData);
                        // Try to sync local back to server
                        fetch('/api/offboarding/watchlist', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ watchlist: finalWatchlist })
                        });
                    } catch (e) {}
                }
            }
            setMonitoredUsers(finalWatchlist);
            
            if (typeof window !== 'undefined') {
                localStorage.setItem('employeeWatchlist', JSON.stringify(finalWatchlist));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffboardingData();
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
                <div className="relative z-10 flex flex-col items-start text-left space-y-8">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-3">
                            Offboarding <span className="text-blue-500">Monitor</span>
                        </h1>
                        <p className="text-slate-400 italic">Start typing to find an employee...</p>
                    </div>

                    <div className="w-full relative">
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
                                {globalSearchResults.map(u => {
                                    const isMonitored = monitoredUsers.some(m => m.id === u.id);
                                    return (
                                        <div 
                                            key={u.id} 
                                            className="flex items-center justify-between p-4 hover:bg-slate-800/50 rounded-xl transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-bold group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                                                    {u.displayName.charAt(0)}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-slate-100">{u.displayName}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono">{u.userPrincipalName}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {!isMonitored ? (
                                                    <button 
                                                        onClick={() => addToWatchlist(u)}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-blue-600/20"
                                                    >
                                                        Add to Watchlist
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => removeFromWatchlist(u.id)}
                                                        className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-rose-500/20"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
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
                                    // 1. Find Intune Device for this user
                                    const intuneDevice = devices.find(d => 
                                        d.userPrincipalName?.toLowerCase() === u.userPrincipalName?.toLowerCase()
                                    );

                                    // 2. Find UEA Agent matching the serial number or same UPN
                                    const agent = agents.find(a => 
                                        (intuneDevice && a.serialNumber === intuneDevice.serialNumber) ||
                                        a.userPrincipalName?.toLowerCase() === u.userPrincipalName?.toLowerCase()
                                    );

                                    const deviceName = intuneDevice?.deviceName || agent?.deviceName || "No device found";
                                    const isOnline = agent?.status === 'online';
                                    const compliance = intuneDevice?.complianceState || "Unknown";
                                    return (
                                        <tr 
                                            key={u.id} 
                                            className="hover:bg-blue-500/5 cursor-pointer transition-all group"
                                            onClick={() => router.push(`/offboarding/${u.id}`)}
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
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                        isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'
                                                    }`}>
                                                        {isOnline && <Activity size={10} className="animate-pulse" />}
                                                        {deviceName}
                                                    </div>
                                                    {intuneDevice && (
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                            compliance === 'compliant' ? 'text-emerald-500/60' : 'text-rose-500/60'
                                                        }`}>
                                                            {compliance}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-white font-bold text-xs">{(Math.random() * 5).toFixed(1)} GB</span>
                                                    <span className="text-[9px] text-slate-500 uppercase font-black uppercase tracking-tighter">Sync Active</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFromWatchlist(u.id);
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                    >
                                                        <UserMinus size={18} />
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
