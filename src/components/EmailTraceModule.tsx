"use client";

import React, { useState, useEffect } from 'react';
import { Search, Calendar, Download, RefreshCw, ShieldAlert, Mail, Paperclip, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

export default function EmailTraceModule({ userId, userDisplayName, sinceDate, oneDriveUrl }: { userId: string, userDisplayName: string, sinceDate?: string, oneDriveUrl?: string }) {
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [folder, setFolder] = useState<'inbox' | 'sentitems'>('sentitems');
    
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
    const [fullMessages, setFullMessages] = useState<Record<string, any>>({});
    const [fetchingFull, setFetchingFull] = useState<string | null>(null);

    const toggleExpand = async (emailId: string) => {
        if (expandedEmailId === emailId) {
            setExpandedEmailId(null);
            return;
        }

        setExpandedEmailId(emailId);
        
        // Fetch full message if not already cached
        if (!fullMessages[emailId]) {
            setFetchingFull(emailId);
            try {
                const res = await fetch(`/api/email/message/${emailId}?userId=${userId}`);
                const result = await res.json();
                if (result.data) {
                    setFullMessages(prev => ({ ...prev, [emailId]: result.data }));
                }
            } catch (err) {
                console.error("Failed to fetch full message:", err);
            } finally {
                setFetchingFull(null);
            }
        }
    };

    const fetchEmails = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `/api/email/trace?userId=${userId}&folder=${folder}`;
            
            const effectiveSince = sinceDate || startDate;
            if (effectiveSince) {
                const startISO = new Date(effectiveSince + "T00:00:00").toISOString();
                const endISO = endDate ? new Date(endDate + "T23:59:59").toISOString() : new Date().toISOString();
                url += `&startDate=${startISO}&endDate=${endISO}`;
            }
            
            const res = await fetch(url);
            const result = await res.json();
            
            if (result.error) throw new Error(result.details || result.error);
            setEmails(result.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchEmails();
    }, [userId, sinceDate, folder]);

    const handleSearch = () => {
        fetchEmails();
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredEmails = emails
        .filter(email => 
            email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.bodyPreview?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a: any, b: any) => {
            const dateA = new Date(a.receivedDateTime || a.sentDateTime).getTime();
            const dateB = new Date(b.receivedDateTime || b.sentDateTime).getTime();
            return dateB - dateA;
        });

    const downloadCSV = () => {
        const headers = ["Subject", folder === 'inbox' ? "Sender" : "Recipient", "Date", "Attachments", "Preview"];
        const rows = filteredEmails.map(email => {
            const contact = folder === 'inbox' 
                ? (email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown')
                : (email.toRecipients?.[0]?.emailAddress?.name || email.toRecipients?.[0]?.emailAddress?.address || 'Unknown');
            
            return [
                `"${email.subject || 'No Subject'}"`,
                `"${contact}"`,
                `"${formatDate(email.receivedDateTime || email.sentDateTime)}"`,
                email.attachments?.length || 0,
                `"${(email.bodyPreview || '').replace(/"/g, '""')}"`
            ];
        });
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${folder === 'inbox' ? 'Inbox' : 'Sent'}_Trace_${userDisplayName.replace(/\s+/g, '_')}.csv`);
        link.click();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <Mail size={24} className="text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Email Trace - {folder === 'inbox' ? 'Inbox' : 'Sent Items'}</h3>
                        <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-0.5">Auditing Outlook {folder === 'inbox' ? 'Received' : 'Sent'} Items</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Folder Toggle */}
                    <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
                        <button 
                            onClick={() => setFolder('sentitems')}
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                folder === 'sentitems' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            Sent
                        </button>
                        <button 
                            onClick={() => setFolder('inbox')}
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                folder === 'inbox' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            Inbox
                        </button>
                    </div>

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
                            onClick={handleSearch}
                            className="ml-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                        >
                            Search
                        </button>
                    </div>
                    <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                    <RefreshCw size={40} className="animate-spin text-blue-500" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Retracing Email Activity...</p>
                </div>
            ) : error ? (
                <div className="bg-rose-500/5 border border-rose-500/10 p-12 rounded-[2rem] text-center">
                    <ShieldAlert className="mx-auto text-rose-500 mb-6" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Access or Fetch Error</h3>
                    <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">{error}</p>
                    <button 
                        onClick={fetchEmails}
                        className="mt-6 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all border border-slate-800"
                    >
                        Retry Audit
                    </button>
                </div>
            ) : (
                <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl shadow-black/50">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <h4 className="font-bold text-slate-300 text-sm">Messages Discovered ({filteredEmails.length})</h4>
                            <div className="h-4 w-[1px] bg-slate-800" />
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                                {folder === 'inbox' ? 'Inbox' : 'Sent Items'} History
                            </p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text" 
                                placeholder="Filter results..." 
                                className="bg-slate-900/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white w-64 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-900/50 text-slate-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-20 backdrop-blur-md">
                                <tr>
                                    <th className="px-8 py-5 border-b border-slate-800">Email Title & Preview</th>
                                    <th className="px-8 py-5 border-b border-slate-800">{folder === 'inbox' ? 'Sender' : 'Recipient'}</th>
                                    <th className="px-8 py-5 border-b border-slate-800 text-center">Attachments</th>
                                    <th className="px-8 py-5 border-b border-slate-800 text-right">{folder === 'inbox' ? 'Received' : 'Sent'} Date</th>
                                    <th className="w-12 border-b border-slate-800"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                                {filteredEmails.map((email: any) => (
                                    <React.Fragment key={email.id}>
                                        <tr 
                                            className={`hover:bg-blue-500/5 cursor-pointer transition-colors group ${expandedEmailId === email.id ? 'bg-blue-500/5' : ''}`}
                                            onClick={() => toggleExpand(email.id)}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="space-y-1">
                                                    <div className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors leading-tight">
                                                        {email.subject || '(No Subject)'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 line-clamp-1 italic font-light">
                                                        {email.bodyPreview}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[11px] font-bold text-slate-300">
                                                    {folder === 'inbox' 
                                                        ? (email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown Sender')
                                                        : (email.toRecipients?.[0]?.emailAddress?.name || email.toRecipients?.[0]?.emailAddress?.address || 'Unknown Recipient')}
                                                </div>
                                                <div className="text-[9px] text-slate-500 truncate max-w-[150px]">
                                                    {folder === 'inbox' 
                                                        ? (email.from?.emailAddress?.address || '')
                                                        : (email.toRecipients?.[0]?.emailAddress?.address || '')}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                {email.hasAttachments ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black border border-blue-500/20">
                                                        <Paperclip size={10} />
                                                        {email.attachments?.length || 1}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-700 text-[10px]">None</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right whitespace-nowrap">
                                                <div className="text-xs font-bold text-slate-300">{formatDate(email.receivedDateTime || email.sentDateTime).split(',')[0]}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{formatDate(email.receivedDateTime || email.sentDateTime).split(',')[1]}</div>
                                            </td>
                                            <td className="pr-6 text-slate-600 group-hover:text-slate-400 transition-colors">
                                                {expandedEmailId === email.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </td>
                                        </tr>
                                        {expandedEmailId === email.id && (
                                            <tr className="bg-blue-500/5">
                                                <td colSpan={4} className="px-8 py-8 border-b border-slate-800/40 animate-in slide-in-from-top-2 duration-300">
                                                    {fetchingFull === email.id ? (
                                                        <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-3">
                                                            <RefreshCw size={24} className="animate-spin text-blue-500" />
                                                            <p className="font-mono text-[9px] uppercase tracking-widest">Loading Full Message...</p>
                                                        </div>
                                                    ) : fullMessages[email.id] ? (
                                                        <div className="space-y-8">
                                                            {/* Metadata */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{folder === 'inbox' ? 'From' : 'To Recipients'}</p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {folder === 'inbox' ? (
                                                                                <span className="px-2 py-1 bg-slate-800 text-slate-300 text-[11px] rounded border border-slate-700">
                                                                                    {fullMessages[email.id].from?.emailAddress.name || fullMessages[email.id].from?.emailAddress.address}
                                                                                </span>
                                                                            ) : (
                                                                                fullMessages[email.id].toRecipients?.map((r: any, idx: number) => (
                                                                                    <span key={idx} className="px-2 py-1 bg-slate-800 text-slate-300 text-[11px] rounded border border-slate-700">{r.emailAddress.name || r.emailAddress.address}</span>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {fullMessages[email.id].ccRecipients?.length > 0 && (
                                                                        <div>
                                                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">CC Recipients</p>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {fullMessages[email.id].ccRecipients.map((r: any, idx: number) => (
                                                                                    <span key={idx} className="px-2 py-1 bg-slate-800 text-slate-300 text-[11px] rounded border border-slate-700">{r.emailAddress.name || r.emailAddress.address}</span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Subject</p>
                                                                        <p className="text-sm font-bold text-white">{fullMessages[email.id].subject}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{folder === 'inbox' ? 'Received' : 'Sent'} Date</p>
                                                                        <p className="text-sm text-slate-300">{formatDate(fullMessages[email.id].receivedDateTime || fullMessages[email.id].sentDateTime)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Body */}
                                                            <div>
                                                                <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-3">Message Body</p>
                                                                <div className="bg-white rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                                                                    {fullMessages[email.id].body?.contentType === 'html' ? (
                                                                        <div 
                                                                            className="p-8 text-black overflow-x-auto min-h-[300px]"
                                                                            dangerouslySetInnerHTML={{ __html: fullMessages[email.id].body.content }}
                                                                        />
                                                                    ) : (
                                                                        <div className="p-8 text-black text-sm leading-relaxed whitespace-pre-wrap font-sans min-h-[100px]">
                                                                            {fullMessages[email.id].body?.content || "No content found."}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Attachments */}
                                                            {fullMessages[email.id].hasAttachments && fullMessages[email.id].attachments && (
                                                                <div>
                                                                    <p className="text-[10px] text-emerald-400 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                                                                        <Paperclip size={10} />
                                                                        Attachments ({fullMessages[email.id].attachments.length})
                                                                    </p>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                        {fullMessages[email.id].attachments.map((att: any, idx: number) => (
                                                                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800 group/att">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="p-2 bg-emerald-500/10 rounded-lg group-hover/att:scale-110 transition-transform">
                                                                                        <Paperclip size={14} className="text-emerald-500" />
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-xs font-bold text-slate-200 truncate pr-2">{att.name}</p>
                                                                                        <p className="text-[10px] text-slate-500 uppercase">{(att.size / 1024).toFixed(1)} KB • {att.contentType.split('/')[1]}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="p-10 text-center text-rose-500 font-black uppercase tracking-widest text-xs">
                                                            Error loading full message.
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {filteredEmails.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <Mail size={32} className="mx-auto text-slate-800 mb-4 opacity-50" />
                                            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">No emails found in this folder for the selected range.</p>
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
