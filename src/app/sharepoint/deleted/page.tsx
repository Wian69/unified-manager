"use client";

import { useEffect, useState } from "react";
import { Trash2, HardDrive, RefreshCw, TriangleAlert, ExternalLink, User } from "lucide-react";

interface DeletionItem {
    siteUrl: string;
    owner: string;
    deletedFileCount: number;
    deletedFileSize: number;
    lastActivity: string;
    isPersonal: boolean;
}

export default function SharePointDeletionsPage() {
    const [data, setData] = useState<DeletionItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalSize, setTotalSize] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/sharepoint/deleted');
            const result = await res.json();
            if (result.data) {
                setData(result.data);
                setTotalCount(result.totalDeletedCount || 0);
                setTotalSize(result.totalDeletedSize || 0);
            } else if (result.error) {
                setError(result.error);
            }
        } catch (error) {
            console.error("Failed to fetch SharePoint deletions", error);
            setError("Failed to connect to API");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center bg-slate-900/40 p-8 rounded-3xl border border-slate-800/60 backdrop-blur-xl">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-rose-500/20 text-rose-400 rounded-2xl shadow-lg shadow-rose-500/10">
                        <Trash2 size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">SharePoint Deletions</h1>
                        <p className="text-slate-400 font-medium">Tracking data removal across personal sites (last 30 days).</p>
                    </div>
                </div>
                <button 
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl transition-all border border-slate-700 hover:border-slate-600 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    {loading ? "Syncing..." : "Sync Report"}
                </button>
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-400">
                    <TriangleAlert size={20} />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6 backdrop-blur-md flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                        <Trash2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400 font-medium">Total Files Deleted</p>
                        <p className="text-2xl font-bold text-white">{totalCount.toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6 backdrop-blur-md flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        <HardDrive size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400 font-medium">Total Data Deleted</p>
                        <p className="text-2xl font-bold text-white">{formatBytes(totalSize)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 backdrop-blur-md overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-800/60 flex justify-between items-center bg-slate-950/30">
                    <h2 className="font-bold text-slate-200">Deletions by User (Personal Sites)</h2>
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">{data.length} active sites found</span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-900/60 border-b border-slate-800/60 text-slate-400 text-sm font-semibold">
                                <th className="px-6 py-4">User / Site</th>
                                <th className="px-6 py-4 text-center">Files Deleted</th>
                                <th className="px-6 py-4 text-right">Data Deleted</th>
                                <th className="px-6 py-4 text-center">Last Activity</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {loading ? (
                                [1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-6 h-12 bg-slate-800/10"></td>
                                    </tr>
                                ))
                            ) : data.length > 0 ? (
                                data.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-800 p-2 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                                                        {item.owner || "Unknown User"}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-mono truncate max-w-[200px]" title={item.siteUrl}>
                                                        {item.siteUrl}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded-md text-sm font-bold border border-rose-500/20">
                                                {item.deletedFileCount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-300 font-medium">
                                            {formatBytes(item.deletedFileSize)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-slate-500">
                                            {item.lastActivity || "N/A"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a 
                                                href={item.siteUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-slate-500 hover:text-white p-2 inline-block transition-colors"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        No deletion data available for the selected period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
