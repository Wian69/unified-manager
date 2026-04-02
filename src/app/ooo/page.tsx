'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
    Users, 
    Search, 
    Mail, 
    Save, 
    RefreshCw, 
    Loader2, 
    Clock,
    UserCircle,
    Check,
    MapPin,
    Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamic Import to completely bypass SSR/Hydration crashes
const OOORichEditor = dynamic(() => import('@/components/OOORichEditor'), { 
    ssr: false,
    loading: () => <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse h-64 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest">Loading Editor...</div>
});

interface User {
    id: string;
    displayName: string;
    userPrincipalName: string;
    jobTitle?: string;
    officeLocation?: string;
    mobilePhone?: string;
    businessPhones?: string[];
}

const REGIONS = ['All', 'Southern', 'Western', 'Northern', 'Eastern'];

export default function OOOManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRegion, setFilterRegion] = useState('All');
    
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [oooStatusMap, setOooStatusMap] = useState<Record<string, any>>({});
    const [fetchingStatuses, setFetchingStatuses] = useState(false);
    const [mailboxSettings, setMailboxSettings] = useState<any>(null);
    const [loadingMailbox, setLoadingMailbox] = useState(false);
    const [savingMailbox, setSavingMailbox] = useState(false);
    const [syncProgress, setSyncProgress] = useState<{ current: number, total: number } | null>(null);
    
    const internalEditorRef = useRef<HTMLDivElement>(null);
    const externalEditorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/users?onlyLicensed=true')
            .then(res => res.json())
            .then(data => {
                if (data.users) setUsers(data.users);
                setLoadingUsers(false);
            })
            .catch(() => setLoadingUsers(false));
    }, []);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                u.userPrincipalName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRegion = filterRegion === 'All' || 
                                (u.officeLocation || '').toLowerCase().includes(filterRegion.toLowerCase());
            return matchesSearch && matchesRegion;
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [users, searchQuery, filterRegion]);

    useEffect(() => {
        if (filteredUsers.length === 0 || fetchingStatuses) return;
        const idsToFetch = filteredUsers.map(u => u.id).filter(id => !oooStatusMap[id]);
        if (idsToFetch.length === 0) return;
        setFetchingStatuses(true);
        fetch('/api/batch/ooo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: idsToFetch.slice(0, 40) })
        })
        .then(res => res.json())
        .then(data => {
            if (data.statusMap) setOooStatusMap(prev => ({ ...prev, ...data.statusMap }));
        })
        .finally(() => setFetchingStatuses(false));
    }, [filteredUsers, oooStatusMap, fetchingStatuses]);

    const isBulkMode = selectedUserIds.length > 1;
    const activeUserId = selectedUserIds.length === 1 ? selectedUserIds[0] : null;
    const activeUser = useMemo(() => users.find(u => u.id === activeUserId), [users, activeUserId]);

    useEffect(() => {
        if (!activeUserId) {
            if (!isBulkMode) setMailboxSettings(null);
            return;
        }
        setLoadingMailbox(true);
        fetch(`/api/users/${activeUserId}/mailbox?t=${Date.now()}`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) setMailboxSettings(data);
                setLoadingMailbox(false);
            })
            .catch(() => setLoadingMailbox(false));
    }, [activeUserId, isBulkMode]);

    useEffect(() => {
        if (isBulkMode) {
            // If we just entered bulk mode, or were in single mode, provide a template
            // We only reset if the status matches a new session or is empty
            setMailboxSettings((prev: any) => {
                if (prev && !isBulkMode) return prev; // Should not happen with logic above
                if (prev && prev.isTemplate) return prev; // Already a template

                // NEW: Clear the draft when entering bulk mode for the first time
                localStorage.removeItem('ooo_bulk_draft');

                return {
                    isTemplate: true,
                    automaticRepliesSetting: {
                        status: 'disabled',
                        internalReplyMessage: 'I am currently out of the office and will return shortly.\n\nRegards,\n{Name}',
                        externalReplyMessage: 'Thank you for your email. I am currently out of the office with limited access to email.\n\nFor urgent matters, please contact {Name} at {Mobile}.\n\nKind regards,\n{Name}',
                        scheduledStartDateTime: { dateTime: new Date().toISOString().split('.')[0] + '.0000000', timeZone: 'UTC' },
                        scheduledEndDateTime: { dateTime: new Date(Date.now() + 86400000).toISOString().split('.')[0] + '.0000000', timeZone: 'UTC' }
                    }
                };
            });
        }
    }, [isBulkMode]);

    // Content Initialization (Client-Side Only)
    useEffect(() => {
        if (mailboxSettings) {
            const intMsg = sanitizeOOO(mailboxSettings.automaticRepliesSetting?.internalReplyMessage || '');
            const extMsg = sanitizeOOO(mailboxSettings.automaticRepliesSetting?.externalReplyMessage || '');
            
            // Timeout to ensure dynamic editors are mounted
            setTimeout(() => {
                if (internalEditorRef.current) internalEditorRef.current.innerHTML = intMsg;
                if (externalEditorRef.current) externalEditorRef.current.innerHTML = extMsg;
            }, 10); // Reduced delay for faster reset
        }
    }, [mailboxSettings, activeUserId]);

    const handleSafetyReset = () => {
        setMailboxSettings({
            isTemplate: true,
            automaticRepliesSetting: {
                status: 'disabled',
                internalReplyMessage: 'I am currently out of the office and will return shortly.\n\nRegards,\n{Name}',
                externalReplyMessage: 'Thank you for your email. I am currently out of the office with limited access to email.\n\nFor urgent matters, please contact {Name} at {Mobile}.\n\nKind regards,\n{Name}',
                scheduledStartDateTime: { dateTime: new Date().toISOString().split('.')[0] + '.0000000', timeZone: 'UTC' },
                scheduledEndDateTime: { dateTime: new Date(Date.now() + 86400000).toISOString().split('.')[0] + '.0000000', timeZone: 'UTC' }
            }
        });
        localStorage.removeItem('ooo_bulk_draft');
    };

    const updateInternalMessage = (html: string) => {
        if (!mailboxSettings) return;
        setMailboxSettings({
            ...mailboxSettings,
            automaticRepliesSetting: {
                ...mailboxSettings.automaticRepliesSetting,
                internalReplyMessage: html
            }
        });
    };

    const updateExternalMessage = (html: string) => {
        if (!mailboxSettings) return;
        setMailboxSettings({
            ...mailboxSettings,
            automaticRepliesSetting: {
                ...mailboxSettings.automaticRepliesSetting,
                externalReplyMessage: html
            }
        });
    };

    // Persistence - Save Draft in Bulk Mode
    useEffect(() => {
        if (isBulkMode && mailboxSettings?.automaticRepliesSetting) {
            const draft = {
                internal: internalEditorRef.current?.innerHTML || '',
                external: externalEditorRef.current?.innerHTML || ''
            };
            if (draft.internal || draft.external) {
                localStorage.setItem('ooo_bulk_draft', JSON.stringify(draft));
            }
        }
    }, [isBulkMode, savingMailbox]); // Save on significant events or would need a timer

    // Periodically save draft while typing if in bulk mode
    useEffect(() => {
        if (!isBulkMode) return;
        const interval = setInterval(() => {
            const draft = {
                internal: internalEditorRef.current?.innerHTML || '',
                external: externalEditorRef.current?.innerHTML || ''
            };
            localStorage.setItem('ooo_bulk_draft', JSON.stringify(draft));
        }, 5000);
        return () => clearInterval(interval);
    }, [isBulkMode]);

    // Restore Draft on Mount
    useEffect(() => {
        const saved = localStorage.getItem('ooo_bulk_draft');
        if (saved && isBulkMode) {
            try {
                const draft = JSON.parse(saved);
                setTimeout(() => {
                    if (internalEditorRef.current) internalEditorRef.current.innerHTML = draft.internal;
                    if (externalEditorRef.current) externalEditorRef.current.innerHTML = draft.external;
                }, 100);
            } catch {}
        }
    }, [isBulkMode]);

    const getOOODisplayStatus = (userId: string) => {
        const config = oooStatusMap[userId];
        if (!config || config === 'unknown' || config === 'disabled' || config.status === 'disabled') return 'disabled';
        
        if (config.status === 'scheduled') {
            const now = new Date().getTime();
            const start = new Date(config.scheduledStartDateTime?.dateTime).getTime();
            const end = new Date(config.scheduledEndDateTime?.dateTime).getTime();
            
            if (now >= start && now <= end) return 'alwaysEnabled'; // Logic: Scheduled is active NOW
            return 'scheduled';
        }
        
        return config.status; // already 'alwaysEnabled'
    };

    const insertToken = (target: 'internal' | 'external', token: string) => {
        const ref = target === 'internal' ? internalEditorRef : externalEditorRef;
        if (!ref.current) return;
        ref.current.focus();
        try {
            document.execCommand('insertText', false, token);
        } catch {
            // Fallback for older browsers or complex ranges
            ref.current.innerHTML += token;
        }
    };

    const toggleUserSelection = (id: string) => {
        setSelectedUserIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSaveOOO = async () => {
        if (selectedUserIds.length === 0 || !mailboxSettings) return;
        
        // Use the state-driven messages as the base for the sync (prevents race conditions)
        let internalHtml = mailboxSettings.automaticRepliesSetting.internalReplyMessage || '';
        let externalHtml = mailboxSettings.automaticRepliesSetting.externalReplyMessage || '';
        
        // AUTO-REPAIR: If in Bulk Mode, automatically convert any accidental 'Amanda Law' back to tokens
        if (isBulkMode) {
            internalHtml = internalHtml.replace(/Amanda Law/gi, '{Name}');
            externalHtml = externalHtml.replace(/Amanda Law/gi, '{Name}');
        }
        
        // Date Validation for Scheduling
        if (mailboxSettings.automaticRepliesSetting.status === 'scheduled') {
            const start = new Date(mailboxSettings.automaticRepliesSetting.scheduledStartDateTime.dateTime).getTime();
            const end = new Date(mailboxSettings.automaticRepliesSetting.scheduledEndDateTime.dateTime).getTime();
            if (end <= start) {
                alert("Error: Scheduled End Date must be after the Start Date.");
                return;
            }
        }

        setSavingMailbox(true);

        setSyncProgress({ current: 0, total: selectedUserIds.length });
        let successCount = 0;
        for (let i = 0; i < selectedUserIds.length; i++) {
            const id = selectedUserIds[i];
            const u = users.find(user => user.id === id);
            setSyncProgress({ current: i + 1, total: selectedUserIds.length });
            
            // Token Replacement Logic
            const name = u?.displayName || '';
            const mobile = u?.mobilePhone || (u?.businessPhones && u.businessPhones[0]) || 'No Mobile Registered';
            
            const personalizedInternal = internalHtml
                .replace(/{Name}/gi, name)
                .replace(/{Mobile( Phone)?}/gi, mobile);
                
            const personalizedExternal = externalHtml
                .replace(/{Name}/gi, name)
                .replace(/{Mobile( Phone)?}/gi, mobile);

            try {
                const res = await fetch(`/api/users/${id}/mailbox`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        automaticRepliesSetting: {
                            ...mailboxSettings.automaticRepliesSetting,
                            internalReplyMessage: personalizedInternal,
                            externalReplyMessage: personalizedExternal
                        }
                    }),
                });
                if (res.ok) {
                    successCount++;
                    setOooStatusMap(prev => ({ ...prev, [id]: mailboxSettings.automaticRepliesSetting }));
                }
            } catch {}
        }
        setSavingMailbox(false);
        setSyncProgress(null);
        alert(`Sync Complete: ${successCount} updated.`);
        if (selectedUserIds.length === 1) setSelectedUserIds([]);
    };

    const applyCommand = (command: string, value: string) => {
        try { document.execCommand(command, false, value); } catch {}
    };

    function sanitizeOOO(html: any) {
        if (!html || typeof html !== 'string') return '';
        if (html.includes('<body')) {
            const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            if (match) return match[1];
        }
        return html;
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] -m-8 bg-slate-950 overflow-hidden relative">
            <div className="absolute top-2 right-2 text-[8px] font-black text-slate-500 pointer-events-none z-50">VER-1.4.3-STABLE</div>

            {/* Sidebar */}
            <div className="w-80 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3"><Users size={20} className="text-blue-500" /><h2 className="text-lg font-bold text-white uppercase">Users</h2></div>
                        {filteredUsers.length > 0 && <button onClick={() => setSelectedUserIds(selectedUserIds.length === filteredUsers.length ? [] : filteredUsers.map(u => u.id))} className="text-[10px] font-black uppercase text-slate-500">Select All</button>}
                    </div>
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none" />
                </div>

                {/* Region Chips */}
                <div className="px-6 py-2 border-b border-slate-900 bg-slate-950/40">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                        {REGIONS.map(region => (
                            <button
                                key={region}
                                onClick={() => setFilterRegion(region)}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border ${
                                    filterRegion === region 
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40' 
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                                }`}
                            >
                                <MapPin size={10} className={filterRegion === region ? 'text-white' : 'text-slate-600'} />
                                {region}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {loadingUsers ? <Loader2 className="animate-spin text-blue-600 mx-auto mt-8" /> : filteredUsers.map(user => (
                        <div key={user.id} onClick={() => toggleUserSelection(user.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${selectedUserIds.includes(user.id) ? 'bg-blue-600/10 border border-blue-600/30' : 'hover:bg-slate-900 border border-transparent'}`}>
                             <div className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${selectedUserIds.includes(user.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-950 border-slate-800 text-transparent'}`}><Check size={12} strokeWidth={4} /></div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-bold truncate text-slate-200">{user.displayName}</div>
                                    {getOOODisplayStatus(user.id) !== 'disabled' && (
                                        <div className="flex items-center gap-1">
                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${getOOODisplayStatus(user.id) === 'scheduled' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                                            <span className={`text-[7px] font-black uppercase tracking-tighter ${getOOODisplayStatus(user.id) === 'scheduled' ? 'text-indigo-400' : 'text-emerald-500'}`}>
                                                {getOOODisplayStatus(user.id) === 'scheduled' ? 'Scheduled' : 'Active'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-[9px] uppercase tracking-tight font-black text-slate-500">{user.jobTitle || 'No Title'}</div>
                             </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 bg-slate-950 flex flex-col min-w-0">
                <AnimatePresence mode="wait">
                {selectedUserIds.length === 0 ? (
                    <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-slate-500"><Clock size={48} className="text-slate-700" /><h3 className="text-xl font-bold uppercase p-4">Select Users</h3></motion.div>
                ) : (
                    <motion.div key={activeUserId || 'bulk'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col p-8 overflow-y-auto">
                        <header className="flex items-start justify-between mb-12">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">{isBulkMode ? <Users size={40} className="text-white" /> : <UserCircle size={40} className="text-blue-500" />}</div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">{isBulkMode ? `Bulk Update: ${selectedUserIds.length} Users` : activeUser?.displayName}</h2>
                                        {!isBulkMode && activeUser?.mobilePhone && (
                                            <div className="px-2 py-0.5 bg-emerald-600/10 border border-emerald-500/20 rounded text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                                <Smartphone size={8} /> {activeUser.mobilePhone}
                                            </div>
                                        )}
                                        {!isBulkMode && !activeUser?.mobilePhone && activeUser?.businessPhones?.[0] && (
                                            <div className="px-2 py-0.5 bg-blue-600/10 border border-blue-500/20 rounded text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                                                <Smartphone size={8} /> {activeUser.businessPhones[0]}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-slate-400 font-medium text-sm">{activeUser?.userPrincipalName}</p>
                                </div>
                            </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleSaveOOO} disabled={savingMailbox || loadingMailbox} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white font-black uppercase text-xs px-8 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/20">{savingMailbox ? <RefreshCw className="animate-spin mr-2 inline" /> : <Save className="mr-2 inline" />} Sync to Outlook</button>
                                    {isBulkMode && (
                                        <button onClick={handleSafetyReset} className="bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold uppercase text-[9px] px-4 py-4 rounded-2xl border border-slate-800 transition-all">Safety Reset</button>
                                    )}
                                </div>
                        </header>

                        {loadingMailbox ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                        ) : mailboxSettings ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-6">
                                    <div className="flex items-center gap-3 text-lg font-bold text-white uppercase"><RefreshCw size={20} className="text-blue-500" />Reply Configuration</div>
                                    <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                                        <span className="text-sm font-bold text-slate-300">Reply Status</span>
                                        <select value={mailboxSettings.automaticRepliesSetting?.status || 'disabled'} onChange={(e) => setMailboxSettings({...mailboxSettings, automaticRepliesSetting: {...mailboxSettings.automaticRepliesSetting, status: e.target.value}})} className="bg-slate-900 border border-slate-800 text-white text-xs font-black uppercase px-4 py-2 rounded-xl focus:outline-none">
                                            <option value="disabled">Disabled</option><option value="alwaysEnabled">Always Enabled</option><option value="scheduled">Scheduled</option>
                                        </select>
                                    </div>
                                    {mailboxSettings.automaticRepliesSetting?.status === 'scheduled' && (
                                        <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Start</label>
                                                <input 
                                                    type="datetime-local" 
                                                    value={mailboxSettings.automaticRepliesSetting?.scheduledStartDateTime?.dateTime?.split('.')[0]?.slice(0, 16) || ''} 
                                                    onChange={(e) => setMailboxSettings({...mailboxSettings, automaticRepliesSetting: {...mailboxSettings.automaticRepliesSetting, scheduledStartDateTime: {dateTime: e.target.value + ':00.0000000', timeZone: 'UTC'}}})} 
                                                    className="w-full bg-slate-900 border border-slate-800 text-white text-sm p-3 rounded-xl" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">End</label>
                                                <input 
                                                    type="datetime-local" 
                                                    value={mailboxSettings.automaticRepliesSetting?.scheduledEndDateTime?.dateTime?.split('.')[0]?.slice(0, 16) || ''} 
                                                    onChange={(e) => setMailboxSettings({...mailboxSettings, automaticRepliesSetting: {...mailboxSettings.automaticRepliesSetting, scheduledEndDateTime: {dateTime: e.target.value + ':00.0000000', timeZone: 'UTC'}}})} 
                                                    className="w-full bg-slate-900 border border-slate-800 text-white text-sm p-3 rounded-xl" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-10">
                                    <div className="space-y-2">
                                        <OOORichEditor 
                                            key={`int-${activeUserId || 'bulk'}`}
                                            id="internal"
                                            label="Internal Message"
                                            onCommand={applyCommand}
                                            onChange={updateInternalMessage}
                                            ref={internalEditorRef}
                                        />
                                        {isBulkMode && (
                                            <div className="flex gap-4 ml-2">
                                                <button onClick={() => insertToken('internal', '{Name}')} className="text-[9px] font-black uppercase text-blue-500 hover:text-white transition-colors flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                                                    <UserCircle size={10} /> Insert {'{Name}'}
                                                </button>
                                                <button onClick={() => insertToken('internal', '{Mobile}')} className="text-[9px] font-black uppercase text-emerald-500 hover:text-white transition-colors flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                                    <Smartphone size={10} /> Insert {'{Mobile}'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <OOORichEditor 
                                            key={`ext-${activeUserId || 'bulk'}`}
                                            id="external"
                                            label="External Message"
                                            onCommand={applyCommand}
                                            onChange={updateExternalMessage}
                                            ref={externalEditorRef}
                                        />
                                        {isBulkMode && (
                                            <div className="flex gap-4 ml-2">
                                                <button onClick={() => insertToken('external', '{Name}')} className="text-[9px] font-black uppercase text-blue-500 hover:text-white transition-colors flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                                                    <UserCircle size={10} /> Insert {'{Name}'}
                                                </button>
                                                <button onClick={() => insertToken('external', '{Mobile}')} className="text-[9px] font-black uppercase text-emerald-500 hover:text-white transition-colors flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                                    <Smartphone size={10} /> Insert {'{Mobile}'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
            `}</style>
        </div>
    );
}
