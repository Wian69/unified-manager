"use client";

import { useEffect, useState } from "react";
import { Trash2, HardDrive, RefreshCw, TriangleAlert, ExternalLink, User, Search, ArrowLeft, FileText, Clock, Shield, X } from "lucide-react";

interface UserResult {
    id: string;
    displayName: string;
    userPrincipalName: string;
}

interface RecycleBinItem {
    id: string;
    name: string;
    size: number;
    deletedDateTime: string;
    deletedBy: string;
    siteUrl: string;
    webUrl: string;
}

export default function SharePointDeletionsPage() {
    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [userResults, setUserResults] = useState<UserResult[]>([]);
    const [searching, setSearching] = useState(false);
    
    // Selection State
    const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
    const [recycleBinItems, setRecycleBinItems] = useState<RecycleBinItem[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isNotProvisioned, setIsNotProvisioned] = useState(false);
    
    // Global State
    const [error, setError] = useState<string | null>(null);

    // Search for users
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length < 3) {
                setUserResults([]);
                return;
            }
            
            setSearching(true);
            try {
                const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                setUserResults(data.users || []);
            } catch (err) {
                console.error("User search failed", err);
            } finally {
                setSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Fetch live recycle bin for selected user
    const fetchUserRecycleBin = async (user: UserResult) => {
        setSelectedUser(user);
        setLoadingDetails(true);
        setError(null);
        setIsNotProvisioned(false);
        setRecycleBinItems([]);
        
        try {
            const res = await fetch(`/api/sharepoint/deleted?userId=${user.id}`);
            const result = await res.json();
            
            if (result.data) {
                setRecycleBinItems(result.data);
            } else if (result.error) {
                setError(result.error);
                if (result.isNotProvisioned) {
                    setIsNotProvisioned(true);
                }
            }
        } catch (err) {
            console.error("Recycle bin fetch failed", err);
            setError("Failed to fetch live recycle bin data");
        } finally {
            setLoadingDetails(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const safeFormatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    };

    const safeFormatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="text-blue-500" size={20} />
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Administrator Portal</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        User Deletion <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Manager</span>
                    </h1>
                    <p className="text-slate-400 mt-2 max-w-2xl">
                        Search for a user to manage their live SharePoint and OneDrive recycle bins, mirroring the official Tenant Profile Admin experience.
                    </p>
                </div>
            </div>

            {/* Search View */}
            <div className="space-y-6">
                <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 p-8 backdrop-blur-md relative overflow-hidden group shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                    <div className="relative z-10 space-y-4">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider ml-1">Search User Profiles</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                            <input 
                                type="text" 
                                placeholder="Enter Name or User Principal Name (UPN)..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-5 pl-14 pr-4 text-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                            />
                            {searching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <RefreshCw className="animate-spin text-blue-500" size={20} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {userResults.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {userResults.map((user) => (
                            <button 
                                key={user.id}
                                onClick={() => fetchUserRecycleBin(user)}
                                className="flex items-center gap-4 p-5 bg-slate-900/40 border border-slate-800/60 rounded-2xl hover:border-blue-500/40 hover:bg-slate-800/40 transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                                    <User className="text-blue-500" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white truncate">{user.displayName}</h3>
                                    <p className="text-xs text-slate-500 truncate">{user.userPrincipalName}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : searchQuery.length >= 3 && !searching ? (
                    <div className="text-center py-12 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                        <User className="mx-auto text-slate-700 mb-4" size={48} />
                        <p className="text-slate-500">No user profiles found matching "{searchQuery}"</p>
                    </div>
                ) : null}
            </div>

            {/* Recycle Bin Full Pane Overlay */}
            {selectedUser && (
                <div className="fixed inset-0 lg:left-64 z-50 bg-[#0b0f19] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 overflow-y-auto">
                    <div className="w-full flex flex-col min-h-full">
                        <div className="flex justify-between items-center p-8 border-b border-slate-800/60 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white leading-tight">{selectedUser.displayName}</h2>
                                    <p className="text-slate-400 font-mono text-sm leading-none">{selectedUser.userPrincipalName}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white transition-colors bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-8 flex-1 overflow-y-auto w-full">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                                    <RefreshCw className="animate-spin text-blue-400" size={32} />
                                    Scanning SharePoint & OneDrive Recycle Bins...
                                </div>
                            ) : isNotProvisioned ? (
                                <div className="bg-slate-900/40 rounded-3xl border border-amber-500/20 p-12 backdrop-blur-md flex flex-col items-center text-center space-y-6 shadow-2xl relative overflow-hidden max-w-4xl mx-auto mt-10">
                                    <div className="absolute inset-0 bg-amber-500/5 pointer-events-none"></div>
                                    <div className="w-24 h-24 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 animate-pulse">
                                        <TriangleAlert size={48} />
                                    </div>
                                    <div className="space-y-2 max-w-md relative z-10">
                                        <h3 className="text-2xl font-black text-white">OneDrive Not Provisioned</h3>
                                        <p className="text-slate-400">
                                            The personal site for <span className="text-white font-bold">{selectedUser.displayName}</span> has not been created yet. 
                                            This usually happens if the user has never logged into Microsoft 365 or OneDrive.
                                        </p>
                                    </div>
                                    <div className="flex gap-4 relative z-10">
                                        <a 
                                            href={`https://xxeqncs-admin.sharepoint.com/_layouts/15/TenantProfileAdmin/ProfMngr.aspx?ConsoleView=Active&ProfileType=User&SearchString=${encodeURIComponent(selectedUser.userPrincipalName)}`}
                                            target="_blank"
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                                        >
                                            <Shield size={20} /> Inspect in Admin Center
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 pb-10 w-full animate-in fade-in duration-500">
                                    {/* Action Header */}
                                    <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                                        <a 
                                            href={`${recycleBinItems[0]?.siteUrl || '#'}/_layouts/15/RecycleBin.aspx`} 
                                            target="_blank" 
                                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700 font-bold text-xs uppercase tracking-wider"
                                        >
                                            <ExternalLink size={14} /> First-Stage Bin
                                        </a>
                                        <a 
                                            href={`${recycleBinItems[0]?.siteUrl || '#'}/_layouts/15/AdminRecycleBin.aspx?view=5`} 
                                            target="_blank" 
                                            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-lg shadow-rose-600/20 font-bold text-xs uppercase tracking-wider"
                                        >
                                            <Shield size={14} /> Second-Stage Bin (Admin)
                                        </a>
                                        <a 
                                            href={`https://xxeqncs-admin.sharepoint.com/_layouts/15/TenantProfileAdmin/ProfMngr.aspx?ConsoleView=Active&ProfileType=User&ApplicationID=00000000%2D0000%2D0000%2D0000%2D000000000000`} 
                                            target="_blank" 
                                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 font-bold text-xs uppercase tracking-wider"
                                        >
                                            <ExternalLink size={14} /> User Profile
                                        </a>
                                    </div>

                                    {/* Stats Overview */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6 backdrop-blur-md relative overflow-hidden group">
                                            <div className="relative z-10 flex items-center gap-4">
                                                <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                                                    <Trash2 size={28} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Live Recycle Bin Items</p>
                                                    <h3 className="text-4xl font-black text-white mt-1">
                                                        {recycleBinItems.length}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6 backdrop-blur-md relative overflow-hidden group">
                                                <div className="relative z-10 flex items-center gap-4">
                                                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                                                    <HardDrive size={28} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Size Staged</p>
                                                    <h3 className="text-4xl font-black text-white mt-1">
                                                        {formatBytes(recycleBinItems.reduce((acc, curr) => acc + curr.size, 0))}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 backdrop-blur-md overflow-hidden shadow-2xl">
                                        <div className="px-6 py-4 border-b border-slate-800/60 flex justify-between items-center bg-slate-950/30">
                                            <h2 className="font-bold text-slate-200 flex items-center gap-2">
                                                <FileText className="text-blue-500" size={18} />
                                                SharePoint / OneDrive Recycle Bin Content
                                            </h2>
                                            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">First 100 items</span>
                                        </div>
                                        
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-slate-900/60 border-b border-slate-800/60 text-slate-400 text-sm font-semibold">
                                                        <th className="px-6 py-4">Filename</th>
                                                        <th className="px-6 py-4 text-center">Size</th>
                                                        <th className="px-6 py-4 text-right">Deletion Date</th>
                                                        <th className="px-6 py-4 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/40">
                                                    {recycleBinItems.length > 0 ? (
                                                        recycleBinItems.map((item) => (
                                                            <tr key={item.id} className="hover:bg-slate-800/20 transition-colors group">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-slate-800/50 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                                                            <FileText size={18} />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors uppercase text-xs tracking-wide">{item.name}</span>
                                                                            <span className="text-[10px] text-slate-500 truncate max-w-sm">{item.siteUrl}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center font-mono text-xs text-slate-300">
                                                                    {formatBytes(item.size)}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-sm font-bold text-slate-200">{safeFormatDate(item.deletedDateTime)}</span>
                                                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                            <Clock size={10} /> {safeFormatTime(item.deletedDateTime)}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className="px-3 py-1 bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-tighter rounded-full border border-rose-500/20 shadow-sm">
                                                                        Recycled
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-20 text-center">
                                                                <div className="flex flex-col items-center gap-3">
                                                                    <div className="w-16 h-16 rounded-full bg-slate-800/40 flex items-center justify-center text-slate-600 border border-slate-800">
                                                                        <Trash2 size={32} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-slate-300">No deleted files found</p>
                                                                        <p className="text-sm text-slate-500">The recycle bin for this user's personal site is currently empty.</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && !isNotProvisioned && (
                                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-500 max-w-4xl mx-auto mt-10">
                                    <TriangleAlert size={28} />
                                    <div>
                                        <p className="text-lg font-black uppercase tracking-widest">Endpoint Error</p>
                                        <p className="text-sm font-medium opacity-80">{error}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

