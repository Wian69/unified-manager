"use client";

import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Download, RefreshCw, ShieldAlert, Users, Globe, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

export default function TeamsChatModule({ userId, userDisplayName }: { userId: string, userDisplayName: string }) {
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedChatId, setExpandedChatId] = useState<string | null>(null);

    const fetchChats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/teams/chats?userId=${userId}`);
            const result = await res.json();
            
            if (result.error) throw new Error(result.details || result.error);
            setChats(result.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchChats();
    }, [userId]);

    const filteredChats = chats.filter(chat => 
        chat.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.body?.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.externalParticipants?.some((p: string) => p.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const downloadCSV = () => {
        const headers = ["Topic", "Type", "External", "Members", "Preview"];
        const rows = filteredChats.map(chat => [
            `"${chat.topic || 'Unnamed Chat'}"`,
            `"${chat.chatType}"`,
            chat.isExternal ? "YES" : "NO",
            chat.membersCount,
            `"${(chat.lastMessage?.body?.content || '').replace(/<[^>]*>/g, '').replace(/"/g, '""')}"`
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Teams_Audit_${userDisplayName.replace(/\s+/g, '_')}.csv`);
        link.click();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-6 rounded-3xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <MessageSquare size={24} className="text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Teams Communication</h3>
                        <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-0.5">Auditing Teams & Direct Messages</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <Download size={14} /> Export Audit
                    </button>
                    <button 
                        onClick={fetchChats}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                    <RefreshCw size={40} className="animate-spin text-indigo-500" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Intercepting Teams Activity...</p>
                </div>
            ) : error ? (
                <div className="bg-rose-500/5 border border-rose-500/10 p-12 rounded-[2rem] text-center">
                    <ShieldAlert className="mx-auto text-rose-500 mb-6" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Audit Failed</h3>
                    <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">{error}</p>
                    <button 
                        onClick={fetchChats}
                        className="mt-6 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all border border-slate-800"
                    >
                        Retry Connection
                    </button>
                </div>
            ) : (
                <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl shadow-black/50">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <h4 className="font-bold text-slate-300 text-sm">Active Conversations ({filteredChats.length})</h4>
                            <div className="h-4 w-[1px] bg-slate-800" />
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                                Cross-Tenant Detection Enabled
                            </p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text" 
                                placeholder="Filter by person or content..." 
                                className="bg-slate-900/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white w-64 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-900/50 text-slate-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-20 backdrop-blur-md">
                                <tr>
                                    <th className="px-8 py-5 border-b border-slate-800">Conversation Topic</th>
                                    <th className="px-8 py-5 border-b border-slate-800 text-center">Type</th>
                                    <th className="px-8 py-5 border-b border-slate-800 text-center">Risk Factor</th>
                                    <th className="w-12 border-b border-slate-800"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                                {filteredChats.map((chat: any) => (
                                    <React.Fragment key={chat.id}>
                                        <tr 
                                            className="hover:bg-indigo-500/5 cursor-pointer transition-colors group"
                                            onClick={() => setExpandedChatId(expandedChatId === chat.id ? null : chat.id)}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400 font-bold border border-slate-800 group-hover:border-indigo-500/30 transition-all">
                                                        {chat.topic ? chat.topic[0] : <Users size={16} />}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors leading-tight flex items-center gap-2">
                                                            {chat.topic || 'Unnamed Chat'}
                                                            {chat.isExternal && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded text-[9px] font-black uppercase">
                                                                    External
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 line-clamp-1 italic font-light max-w-md" 
                                                             dangerouslySetInnerHTML={{ __html: chat.lastMessage?.body?.content || 'No message content' }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
                                                    {chat.chatType}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                {chat.isExternal ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black border border-rose-500/20">
                                                        <Globe size={10} />
                                                        HIGH RISK
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-700 text-[10px]">Secure</span>
                                                )}
                                            </td>
                                            <td className="pr-6 text-slate-600 group-hover:text-slate-400 transition-colors">
                                                {expandedChatId === chat.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </td>
                                        </tr>
                                        {expandedChatId === chat.id && (
                                            <tr className="bg-indigo-500/5">
                                                <td colSpan={4} className="px-8 py-8 border-b border-slate-800/40 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div>
                                                                <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest mb-3">Conversation Context</p>
                                                                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-slate-300 text-sm leading-relaxed font-sans max-h-40 overflow-y-auto"
                                                                     dangerouslySetInnerHTML={{ __html: chat.lastMessage?.body?.content || 'No detailed message available.' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                                                                    <Users size={10} />
                                                                    Participants & Visibility
                                                                </p>
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                                                                        <span className="text-xs text-slate-400">Total Members:</span>
                                                                        <span className="text-xs font-bold text-white">{chat.membersCount}</span>
                                                                    </div>
                                                                    {chat.isExternal && (
                                                                        <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/10">
                                                                            <p className="text-[10px] text-rose-500 font-bold uppercase mb-2 flex items-center gap-2">
                                                                                <AlertTriangle size={10} />
                                                                                External Participants
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {chat.externalParticipants.map((p: string, idx: number) => (
                                                                                    <span key={idx} className="px-2 py-1 bg-rose-500/10 text-rose-500 text-[10px] rounded border border-rose-500/20 font-medium">
                                                                                        {p}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {filteredChats.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <MessageSquare size={32} className="mx-auto text-slate-800 mb-4 opacity-50" />
                                            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">No Teams conversations discovered.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
