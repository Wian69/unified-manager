"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UserMinus, ShieldAlert, FileText, Activity, RefreshCw, Trash2, Search, ArrowLeft, Download, User, Calendar, ExternalLink } from "lucide-react";

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

    // SharePoint Audit State (Lifted for linking)
    const [selectedSPUser, setSelectedSPUser] = useState<any | null>(null);
    const [recycleBinItems, setRecycleBinItems] = useState<any[]>([]);
    const [loadingSPDetails, setLoadingSPDetails] = useState(false);
    const [spError, setSpError] = useState<string | null>(null);

    const handleGlobalSearch = async () => {
        if (!globalSearchQuery.trim()) return;
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
        setGlobalSearchQuery(user.displayName);
        auditSharePointForUser(user);
    };

    const removeFromWatchlist = (userId: string) => {
        setMonitoredUsers(prev => prev.filter(u => u.id !== userId));
        if (selectedSPUser?.id === userId) {
            setSelectedSPUser(null);
            setRecycleBinItems([]);
        }
    };

    const auditSharePointForUser = async (user: any) => {
        setLoadingSPDetails(true);
        setSpError(null);
        setSelectedSPUser(user);
        setRecycleBinItems([]);
        setGlobalSearchQuery(user.displayName);
        setGlobalSearchResults([]);

        try {
            const res = await fetch(`/api/sharepoint/deleted?userId=${user.id}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setRecycleBinItems(data.data || []);
            document.getElementById('sp-audit-section')?.scrollIntoView({ behavior: 'smooth' });
        } catch (err: any) {
            setSpError(err.message);
        } finally {
            setLoadingSPDetails(false);
        }
    };

    const fetchOffboardingAgents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/agent/list');
            const data = await res.json();
            setAgents(data.agents || []);
        } catch (error) {
            console.error("Failed to fetch agents", error);
        } finally {
            setLoading(false);
        }
    };

    const auditSharePointForAgent = async (agent: any) => {
        const simulatedUser = { 
            id: agent.id, // Fallback ID
            displayName: agent.userDisplayName, 
            userPrincipalName: agent.userPrincipalName 
        };
        auditSharePointForUser(simulatedUser);
    };

    useEffect(() => {
        fetchOffboardingAgents();
    }, []);

    const searchParams = useSearchParams();
    const directUser = searchParams.get('user');

    useEffect(() => {
        if (directUser && agents.length > 0) {
            // Find the agent with this UPN or just audit the UPN directly
            auditSharePointForAgent({ userPrincipalName: directUser, userDisplayName: directUser.split('@')[0] });
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
                        <p className="text-slate-400 max-w-lg mx-auto">Search and add employees to the watchlist to monitor data activity and file deletions.</p>
                    </div>

                    <div className="w-full max-w-2xl relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl">
                            <Search className="ml-4 text-slate-500" size={24} />
                            <input 
                                type="text" 
                                placeholder="Search employee to monitor..." 
                                className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-4 text-lg font-medium placeholder:text-slate-600"
                                value={globalSearchQuery}
                                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                            />
                            <button 
                                onClick={handleGlobalSearch}
                                disabled={searchingGlobal}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl transition-all font-bold text-sm uppercase tracking-widest disabled:opacity-50"
                            >
                                {searchingGlobal ? "Searching..." : "Search"}
                            </button>
                        </div>

                        {globalSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-3xl z-50 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                                {globalSearchResults.map(u => (
                                    <button 
                                        key={u.id} 
                                        onClick={() => addToWatchlist(u)}
                                        className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl transition-all text-left"
                                    >
                                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                                            <User size={20} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="font-bold text-slate-100 truncate">{u.displayName}</div>
                                            <div className="text-[10px] text-slate-500 truncate">{u.userPrincipalName}</div>
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
                                <th className="px-6 py-4">Device Status</th>
                                <th className="px-6 py-4">Data Activity</th>
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
                                            className={`hover:bg-blue-500/5 cursor-pointer transition-all group ${selectedSPUser?.id === u.id ? 'bg-blue-500/10' : ''}`}
                                            onClick={() => auditSharePointForUser(u)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-slate-200">{u.displayName}</div>
                                                <div className="text-[10px] text-slate-500 font-mono italic">{u.userPrincipalName}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {agent ? (
                                                    <>
                                                        <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                                                            <Activity size={12} className="animate-pulse" />
                                                            {agent.deviceName}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 uppercase">{agent.publicIp}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-600 italic">No Device Linked</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-rose-400 font-bold">
                                                    <Activity size={14} className="animate-pulse" />
                                                    High Density
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); removeFromWatchlist(u.id); }}
                                                    className="text-slate-600 hover:text-rose-500 p-2 transition-colors"
                                                    title="Remove from Watchlist"
                                                >
                                                    <ArrowLeft size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-500">
                                    <UserMinus className="mx-auto mb-4 opacity-20" size={48} />
                                    <p>No employees currently in watchlist. Search above to add.</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedSPUser && (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                    {/* SharePoint Deletion Audit Section */}
                    <div id="sp-audit-section" className="bg-slate-900/40 rounded-3xl border border-slate-800/60 overflow-hidden backdrop-blur-md transition-all duration-500">
                        <div className="p-8 border-b border-slate-800/60 bg-blue-500/5">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                        <Trash2 className="text-blue-500" size={28} />
                                        SharePoint / OneDrive Deletion Audit
                                    </h2>
                                    <p className="text-slate-400 text-sm mt-1">Audit and export deletion records for departing users.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-8">
                            <SharePointDeletionsModule 
                                selectedUser={selectedSPUser}
                                setSelectedUser={setSelectedSPUser}
                                recycleBinItems={recycleBinItems}
                                loadingDetails={loadingSPDetails}
                                error={spError}
                            />
                        </div>
                    </div>

                    {/* Activity Feed and Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-950/50 p-8 rounded-3xl border border-slate-800">
                                <h3 className="text-xl font-bold text-white mb-6">User Risk Context</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Access Patterns</p>
                                        <p className="text-slate-200">Multiple after-hours logins detected from unusual locations.</p>
                                    </div>
                                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Policy Status</p>
                                        <p className="text-emerald-400 font-bold">Compliant (Last check 5m ago)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6 backdrop-blur-md">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <FileText size={20} className="text-blue-400" />
                                    Tracked Activity Details
                                </h3>
                                <div className="space-y-4">
                                    <ActivityCard 
                                        title="Mass File Archive (ZIP)" 
                                        device="SIMULATED-DEV" 
                                        time="Current session" 
                                        severity="critical" 
                                    />
                                    <ActivityCard 
                                        title="USB Data Transfer" 
                                        device="SIMULATED-DEV" 
                                        time="2 hours ago" 
                                        severity="high" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SharePointDeletionsModule({ 
    selectedUser, setSelectedUser,
    recycleBinItems, 
    loadingDetails, 
    error 
}: any) {
    const [fileSearchQuery, setFileSearchQuery] = useState("");
    
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortKey, setSortKey] = useState<string>("deletedDateTime");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const safeFormatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    };

    const safeFormatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDirection("desc");
        }
    };

    const downloadCSV = () => {
        if (!selectedUser) return;
        const headers = ["Name", "Size (Bytes)", "Deletion Date", "Deleted By", "URL"];
        const rows = filteredItems.map((item: any) => [
            `"${item.name}"`,
            item.size,
            `"${safeFormatDate(item.deletedDateTime)} ${safeFormatTime(item.deletedDateTime)}"`,
            `"${item.deletedBy}"`,
            `"${item.webUrl}"`
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Offboarding_RecycleBin_${selectedUser.displayName.replace(/\s+/g, '_')}.csv`);
        link.click();
    };

    const filteredItems = recycleBinItems
        .filter((item: any) => {
            const matchesSearch = item.name.toLowerCase().includes(fileSearchQuery.toLowerCase());
            let matchesDate = true;
            if (startDate || endDate) {
                const itemDate = new Date(item.deletedDateTime).getTime();
                if (startDate) {
                    const sDate = new Date(startDate).setHours(0, 0, 0, 0);
                    if (itemDate < sDate) matchesDate = false;
                }
                if (endDate) {
                    const eDate = new Date(endDate).setHours(23, 59, 59, 999);
                    if (itemDate > eDate) matchesDate = false;
                }
            }
            return matchesSearch && matchesDate;
        })
        .sort((a: any, b: any) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === "asc" ? valA - valB : valB - valA;
            }
            return 0;
        });

    if (!selectedUser) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-4">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 animate-pulse">
                    <User size={32} />
                </div>
                <p className="font-mono text-sm uppercase tracking-widest text-slate-600">Select an employee from the watchlist to audit deletions</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-6 rounded-3xl border border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft size={20} className="text-slate-400" />
                    </button>
                    <div>
                        <h3 className="text-xl font-bold text-white">{selectedUser.displayName}</h3>
                        <p className="text-sm text-slate-500">{selectedUser.userPrincipalName}</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <Calendar size={14} className="text-blue-400" />
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-[10px] text-white p-0 w-24"
                        />
                        <span className="text-slate-600 text-xs">-</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-[10px] text-white p-0 w-24"
                        />
                    </div>
                    <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
                    >
                        <Download size={14} /> Export Report
                    </button>
                </div>
            </div>

            {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                    <RefreshCw size={40} className="animate-spin text-blue-500" />
                    <p className="font-mono text-sm uppercase tracking-widest">Auditing SharePoint Recycle Bin...</p>
                </div>
            ) : error ? (
                <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl text-center">
                    <ShieldAlert className="mx-auto text-rose-500 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">Audit Failed</h3>
                    <p className="text-slate-400 max-w-md mx-auto">{error}</p>
                </div>
            ) : (
                <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <h4 className="font-bold text-slate-300">File Deletions Found ({filteredItems.length})</h4>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text" 
                                placeholder="Filter files..." 
                                className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white w-48 focus:ring-1 focus:ring-blue-500"
                                value={fileSearchQuery}
                                onChange={(e) => setFileSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => handleSort("name")}>Filename</th>
                                    <th className="px-6 py-4 text-center cursor-pointer hover:text-white" onClick={() => handleSort("size")}>Size</th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort("deletedDateTime")}>Deletion Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredItems.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-blue-500/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <FileText size={16} className="text-slate-400" />
                                                <span className="font-medium text-slate-200">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-400">
                                            {(item.size / 1024 / 1024).toFixed(2)} MB
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-slate-200 font-bold">{safeFormatDate(item.deletedDateTime)}</div>
                                            <div className="text-[10px] text-slate-500">{safeFormatTime(item.deletedDateTime)}</div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No deletions found matching criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function ActivityCard({ title, device, time, severity }: { title: string, device: string, time: string, severity: string }) {
    return (
        <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all">
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : 
                    severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                    {severity}
                </span>
                <span className="text-[10px] text-slate-500">{time}</span>
            </div>
            <p className="text-sm font-bold text-slate-200 mb-1">{title}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{device}</p>
        </div>
    );
}
