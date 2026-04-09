"use client";

import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Download, RefreshCw, ShieldAlert, Users, Globe, ChevronDown, ChevronUp, AlertTriangle, User, Paperclip, Activity, ExternalLink } from "lucide-react";

export default function TeamsChatModule({ userId, userDisplayName, sinceDate, oneDriveUrl }: { userId: string, userDisplayName: string, sinceDate?: string, oneDriveUrl?: string }) {
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<string, any[]>>({});
    const [loadingMessages, setLoadingMessages] = useState<string | null>(null);
    const [presence, setPresence] = useState<any>(null);
    const [meeting, setMeeting] = useState<any>(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const fetchChats = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `/api/teams/chats?userId=${userId}`;
            if (sinceDate) {
                url += `&sinceDate=${sinceDate}`;
            }
            const res = await fetch(url);
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
            const res = await fetch(`/api/teams/chats?chatId=${chatId}&userId=${userId}`);
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

    const fetchPresence = async () => {
        try {
            const res = await fetch(`/api/teams/presence?userId=${userId}`);
            const data = await res.json();
            if (!data.error) {
                setPresence(data.presence);
                setMeeting(data.meeting);
            }
        } catch (err) {
            console.error("Failed to fetch presence:", err);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchChats();
            fetchPresence();
            
            // Poll presence every 45 seconds for live updates
            const interval = setInterval(fetchPresence, 45000);
            return () => clearInterval(interval);
        }
    }, [userId, sinceDate]);

    const handleExpand = (chatId: string) => {
        if (expandedChatId === chatId) {
            setExpandedChatId(null);
        } else {
            setExpandedChatId(chatId);
            fetchMessages(chatId);
        }
    };

    const filteredChats = chats
        .filter(chat => {
            const topicMatch = chat.topic?.toLowerCase().includes(searchQuery.toLowerCase());
            const contentMatch = chat.lastMessage?.body?.content?.toLowerCase().includes(searchQuery.toLowerCase());
            
            // Date filtering
            const messageDate = chat.lastMessage?.createdDateTime ? new Date(chat.lastMessage.createdDateTime) : null;
            let dateMatch = true;
            if (messageDate) {
                if (startDate) {
                    const start = new Date(startDate + "T00:00:00");
                    if (messageDate < start) dateMatch = false;
                }
                if (endDate) {
                    const end = new Date(endDate + "T23:59:59");
                    if (messageDate > end) dateMatch = false;
                }
            } else if (startDate || endDate) {
                dateMatch = false; // If no date and we're filtering, exclude
            }

            return (topicMatch || contentMatch) && dateMatch;
        })
        .sort((a: any, b: any) => {
            const dateA = new Date(a.lastMessage?.createdDateTime || 0).getTime();
            const dateB = new Date(b.lastMessage?.createdDateTime || 0).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <MessageSquare size={24} className="text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Teams Communication</h3>
                        <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-0.5">Auditing Teams & Direct Messages</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <Globe size={14} className="text-blue-400" />
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
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        <ChevronDown size={14} className="text-slate-500" />
                        <select 
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as any)}
                            className="bg-transparent text-slate-300 text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer"
                        >
                            <option value="desc" className="bg-slate-900">Newest First</option>
                            <option value="asc" className="bg-slate-900">Oldest First</option>
                        </select>
                    </div>

                    <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <Download size={14} /> Export Audit
                    </button>
                    <button 
                        onClick={() => { fetchChats(); fetchPresence(); }}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>
            
            {/* Live Presence & Meeting Alert */}
            {presence && (
                <div className={`flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl border transition-all duration-700 animate-in slide-in-from-top-4 ${
                    meeting 
                    ? 'bg-rose-500/10 border-rose-500/20 shadow-lg shadow-rose-500/5' 
                    : 'bg-slate-900 border-slate-800'
                }`}>
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                meeting ? 'bg-rose-500/20 border-rose-500/30' : 'bg-slate-800 border-slate-700'
                            }`}>
                                <User size={24} className={meeting ? 'text-rose-500' : 'text-slate-400'} />
                            </div>
                            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${
                                presence.availability === 'Available' ? 'bg-emerald-500' :
                                presence.availability === 'Busy' ? 'bg-rose-500' :
                                presence.availability === 'Away' ? 'bg-amber-500' : 'bg-slate-500'
                            }`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">{userDisplayName}</h4>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                    presence.availability === 'Available' ? 'bg-emerald-500/10 text-emerald-500' :
                                    presence.availability === 'Busy' ? 'bg-rose-500/10 text-rose-500' : 'text-slate-500 bg-slate-800'
                                }`}>
                                    {presence.activity}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5 italic">
                                {meeting ? `In meeting: ${meeting.subject}` : 'Not currently in a scheduled session'}
                            </p>
                        </div>
                    </div>

                    {meeting && (
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="flex -space-x-2">
                                {meeting.attendees.slice(0, 4).map((att: any, idx: number) => (
                                    <div key={idx} title={att.name || att.email} className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-slate-400">
                                        {att.name ? att.name[0] : '?'}
                                    </div>
                                ))}
                                {meeting.attendees.length > 4 && (
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-slate-500">
                                        +{meeting.attendees.length - 4}
                                    </div>
                                )}
                            </div>
                            <div className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                <Activity size={12} />
                                Meeting Active
                            </div>
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                    <RefreshCw size={40} className="animate-spin text-blue-500" />
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
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl shadow-black/50">
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
                                className="bg-slate-900/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white w-64 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar overflow-x-hidden">
                        <table className="w-full text-left text-sm border-separate border-spacing-0 table-fixed">
                            <thead className="bg-slate-900/50 text-slate-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-20 backdrop-blur-md">
                                <tr>
                                    <th className="px-8 py-5 border-b border-slate-800 w-[50%]">Conversation Topic</th>
                                    <th className="px-8 py-5 border-b border-slate-800 text-center w-[20%]">Type</th>
                                    <th className="px-8 py-5 border-b border-slate-800 text-center w-[20%]">Risk Factor</th>
                                    <th className="w-12 border-b border-slate-800"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                                {filteredChats.map((chat: any) => (
                                    <React.Fragment key={chat.id}>
                                        <tr 
                                            className="hover:bg-blue-500/5 cursor-pointer transition-colors group"
                                            onClick={() => handleExpand(chat.id)}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400 font-bold border border-slate-800 group-hover:border-indigo-500/30 transition-all">
                                                        {chat.topic ? chat.topic[0] : <Users size={16} />}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors leading-tight flex items-center gap-2">
                                                            {chat.topic || 'Unnamed Chat'}
                                                            {chat.isExternal && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded text-[9px] font-black uppercase">
                                                                    External
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 line-clamp-1 italic font-light max-w-md" 
                                                             dangerouslySetInnerHTML={{ __html: chat.lastMessage?.body?.content || 'Preview unavailable or system message' }}
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
                                                                Full Conversation History
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
                                                                {messages[chat.id]?.slice().reverse().map((msg: any) => {
                                                                    const isSystem = msg.messageType === 'system';
                                                                    if (isSystem) {
                                                                        return (
                                                                            <div key={msg.id} className="flex flex-col items-center py-2">
                                                                                <div className="px-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-full text-[10px] text-slate-500 font-mono uppercase tracking-widest flex items-center gap-2">
                                                                                    <Activity size={10} className="text-blue-500/50" />
                                                                                    <span dangerouslySetInnerHTML={{ __html: msg.body?.content || 'System Event' }} />
                                                                                    <span>• {new Date(msg.createdDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <div key={msg.id} className={`flex flex-col ${msg.from?.user?.id === userId ? 'items-end' : 'items-start'}`}>
                                                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                                                <span className="text-[9px] font-bold text-slate-400">{msg.from?.user?.displayName || 'Unknown'}</span>
                                                                                <span className="text-[8px] text-slate-600">{new Date(msg.createdDateTime).toLocaleString()}</span>
                                                                            </div>
                                                                            <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-xl break-words overflow-hidden ${
                                                                                msg.from?.user?.id === userId 
                                                                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                                                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                                                            }`}>
                                                                                <div 
                                                                                    className="prose prose-invert prose-sm max-w-none [&_img]:max-w-full [&_table]:max-w-full [&_table]:overflow-x-auto"
                                                                                    dangerouslySetInnerHTML={{ __html: msg.body?.content }} 
                                                                                />
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
                                                                    );
                                                                })}
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
                                            {sinceDate && (
                                                <p className="text-[10px] text-indigo-400 mt-2 italic">Try adjusting the "Show data from" date at the top of the page.</p>
                                            )}
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
