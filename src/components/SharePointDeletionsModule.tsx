"use client";

import React, { useState } from 'react';
import { Search, Calendar, Download, RefreshCw, ShieldAlert, FileText, ArrowLeft, User, ExternalLink } from "lucide-react";

export default function SharePointDeletionsModule({ 
    selectedUser, setSelectedUser,
    recycleBinItems, 
    loadingDetails, 
    error,
    oneDriveUrl
}: any) {
    const [fileSearchQuery, setFileSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [appliedFilters, setAppliedFilters] = useState<{ start: string, end: string }>({ start: "", end: "" });
    const [sortKey, setSortKey] = useState<string>("deletedDateTime");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const handleApplyFilters = () => {
        setAppliedFilters({ start: startDate, end: endDate });
    };

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
            if (appliedFilters.start || appliedFilters.end) {
                // Parse date as local YYYY-MM-DD
                const itemDateObj = new Date(item.deletedDateTime);
                const itemTime = itemDateObj.getTime();
                
                if (appliedFilters.start) {
                    const sDate = new Date(appliedFilters.start + "T00:00:00");
                    if (itemTime < sDate.getTime()) matchesDate = false;
                }
                if (appliedFilters.end) {
                    const eDate = new Date(appliedFilters.end + "T23:59:59");
                    if (itemTime > eDate.getTime()) matchesDate = false;
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
                <p className="font-mono text-sm uppercase tracking-widest text-slate-600">No User Selected</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-4">
                    {setSelectedUser && (
                        <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-slate-400" />
                        </button>
                    )}
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
                            className="bg-transparent border-none focus:ring-0 text-[10px] text-white p-0 w-24 [color-scheme:dark]"
                        />
                        <span className="text-slate-600 text-xs">-</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-[10px] text-white p-0 w-24 [color-scheme:dark]"
                        />
                        <button 
                            onClick={handleApplyFilters}
                            className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
                        >
                            Search
                        </button>
                        {(startDate || endDate) && (
                            <button 
                                onClick={() => { setStartDate(""); setEndDate(""); setAppliedFilters({ start: "", end: "" }); }}
                                className="ml-2 text-[9px] text-slate-500 hover:text-white uppercase font-black"
                            >
                                Clear
                            </button>
                        )}
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
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div className="flex flex-col gap-1">
                            <h4 className="font-bold text-slate-300">File Deletions Found ({filteredItems.length})</h4>
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                                Total Data Volume: <span className="text-blue-400 font-bold">
                                    {(() => {
                                        const totalBytes = filteredItems.reduce((acc: number, curr: any) => acc + (curr.size || 0), 0);
                                        if (totalBytes > 1024 * 1024 * 1024) return (totalBytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
                                        return (totalBytes / (1024 * 1024)).toFixed(2) + " MB";
                                    })()}
                                </span>
                            </p>
                        </div>
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
                    <div className="max-h-[600px] overflow-y-auto overflow-x-auto border-t border-slate-800">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-900 text-slate-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:text-white border-b border-slate-800" onClick={() => handleSort("name")}>Filename</th>
                                    <th className="px-6 py-4 text-center cursor-pointer hover:text-white border-b border-slate-800" onClick={() => handleSort("size")}>Size</th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:text-white border-b border-slate-800" onClick={() => handleSort("deletedDateTime")}>Deletion Date</th>
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
