"use client";

import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Download, RefreshCw, ShieldAlert, Users, Globe, ChevronDown, ChevronUp, AlertTriangle, User, Paperclip, Activity } from "lucide-react";

export default function TeamsChatModule({ userId, userDisplayName }: { userId: string, userDisplayName: string }) {
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<string, any[]>>({});
    const [loadingMessages, setLoadingMessages] = useState<string | null>(null);

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

    const fetchMessages = async (chatId: string) => {
        if (messages[chatId]) return; // Already loaded
        
        setLoadingMessages(chatId);
        try {
            const res = await fetch(`/api/teams/chats?chatId=${chatId}`);
            const result = await res.json();
            if (result.success) {
                setMessages(prev => ({ ...prev, [chatId]: result.data }));
            }
        } catch (err) {
            console.error("Failed to fetch messages:", err);
        } finally {
            setLoadingMessages(null);
        }
    };

    useEffect(() => {
        if (userId) fetchChats();
    }, [userId]);

    const handleExpand = (chatId: string) => {
        if (expandedChatId === chatId) {
            setExpandedChatId(null);
        } else {
            setExpandedChatId(chatId);
            fetchMessages(chatId);
        }
    };

    const filteredChats = chats.filter(chat => 
        chat.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.body?.content?.toLowerCase().includes(searchQuery.toLowerCase())
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
                                            onClick={() => handleExpand(chat.id)}
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
                                            <tr className="bg-slate-900/50">
                                                <td colSpan={4} className="px-8 py-8 border-b border-slate-800/40 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest flex items-center gap-2">
                                                                <Activity size={10} />
                                                                Conversation History (Last 20 messages)
                                                            </p>
                                                            {chat.isExternal && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[9px] text-rose-500 font-bold uppercase">External:</span>
                                                                    <div className="flex gap-1">
                                                                        {chat.externalParticipants.map((p: string, idx: number) => (
                                                                            <span key={idx} className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] rounded border border-rose-500/20">
                                                                                {p}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {loadingMessages === chat.id ? (
                                                            <div className="flex flex-col items-center py-12 gap-3">
                                                                <RefreshCw size={24} className="animate-spin text-indigo-500" />
                                                                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Retrieving Secure Log...</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4 max-h-96 overflow-y-auto pr-4 custom-scrollbar">
                                                                {messages[chat.id]?.slice().reverse().map((msg: any) => (
                                                                    <div key={msg.id} className={`flex flex-col ${msg.from?.user?.id === userId ? 'items-end' : 'items-start'}`}>
                                                                        <div className="flex items-center gap-2 mb-1 px-1">
                                                                            <span className="text-[9px] font-bold text-slate-400">{msg.from?.user?.displayName || 'System'}</span>
                                                                            <span className="text-[8px] text-slate-600">{new Date(msg.createdDateTime).toLocaleString()}</span>
                                                                        </div>
                                                                        <div className={`p-4 rounded-2xl max-w-[80%] text-sm shadow-xl ${
                                                                            msg.from?.user?.id === userId 
                                                                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                                                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                                                        }`}>
                                                                            <div dangerouslySetInnerHTML={{ __html: msg.body?.content }} />
                                                                            {msg.attachments?.length > 0 && (
                                                                                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                                                                    {msg.attachments.map((at: any) => (
                                                                                        <div key={at.id} className="flex items-center gap-2 text-[10px] bg-black/20 p-2 rounded-lg">
                                                                                            <Paperclip size={12} className="shrink-0" />
                                                                                            <span className="truncate">{at.name}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {(!messages[chat.id] || messages[chat.id].length === 0) && (
                                                                    <div className="text-center py-12">
                                                                        <MessageSquare size={24} className="mx-auto text-slate-800 mb-2 opacity-30" />
                                                                        <p className="text-[10px] text-slate-600 font-mono italic">No message history discovered for this thread.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
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
