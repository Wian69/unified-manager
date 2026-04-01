'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Users, 
    Search, 
    Mail, 
    Save, 
    RefreshCw, 
    Loader2, 
    Clock,
    UserCircle,
    MapPin,
    Check,
    Type,
    Type as FontSizeIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
    id: string;
    displayName: string;
    userPrincipalName: string;
    jobTitle?: string;
    officeLocation?: string;
}

const REGIONS = ['All', 'Southern', 'Western', 'Northern', 'Eastern'];

export default function OOOManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRegion, setFilterRegion] = useState('All');
    
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [oooStatusMap, setOooStatusMap] = useState<Record<string, string>>({});
    const [fetchingStatuses, setFetchingStatuses] = useState(false);
    const [mailboxSettings, setMailboxSettings] = useState<any>(null);
    const [loadingMailbox, setLoadingMailbox] = useState(false);
    const [savingMailbox, setSavingMailbox] = useState(false);
    const [syncProgress, setSyncProgress] = useState<{ current: number, total: number } | null>(null);
    
    // Editor Refs to prevent re-render crashes during typing
    const internalEditorRef = useRef<HTMLDivElement>(null);
    const externalEditorRef = useRef<HTMLDivElement>(null);

    // Fetch Users
    useEffect(() => {
        fetch('/api/users?onlyLicensed=true')
            .then(res => res.json())
            .then(data => {
                if (data.users) setUsers(data.users);
                setLoadingUsers(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingUsers(false);
            });
    }, []);

    // Filter Users
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                u.userPrincipalName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRegion = filterRegion === 'All' || 
                                (u.officeLocation || '').toLowerCase().includes(filterRegion.toLowerCase());
            return matchesSearch && matchesRegion;
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [users, searchQuery, filterRegion]);

    // Reset selection when filters change to avoid "hidden" selections
    useEffect(() => {
        setSelectedUserIds([]);
    }, [filterRegion, searchQuery]);

    // Background fetch OOO statuses for the visible list
    useEffect(() => {
        if (filteredUsers.length === 0 || fetchingStatuses) return;

        const idsToFetch = filteredUsers
            .map(u => u.id)
            .filter(id => !oooStatusMap[id]);

        if (idsToFetch.length === 0) return;

        setFetchingStatuses(true);
        fetch('/api/batch/ooo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: idsToFetch.slice(0, 40) }) // Fetch up to 40 at a time (2 batches)
        })
        .then(res => res.json())
        .then(data => {
            if (data.statusMap) {
                setOooStatusMap(prev => ({ ...prev, ...data.statusMap }));
            }
        })
        .catch(console.error)
        .finally(() => setFetchingStatuses(false));
    }, [filteredUsers, oooStatusMap, fetchingStatuses]);

    const isBulkMode = selectedUserIds.length > 1;
    const activeUserId = selectedUserIds.length === 1 ? selectedUserIds[0] : null;
    const activeUser = useMemo(() => users.find(u => u.id === activeUserId), [users, activeUserId]);

    // Fetch Mailbox Settings when a SINGLE user is selected
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
            .catch(err => {
                console.error(err);
                setLoadingMailbox(false);
            });
    }, [activeUserId, isBulkMode]);

    // Initialize template for bulk mode if needed
    useEffect(() => {
        if (isBulkMode && !mailboxSettings) {
            setMailboxSettings({
                automaticRepliesSetting: {
                    status: 'disabled',
                    internalReplyMessage: '',
                    externalReplyMessage: '',
                    scheduledStartDateTime: { dateTime: new Date().toISOString(), timeZone: 'UTC' },
                    scheduledEndDateTime: { dateTime: new Date(Date.now() + 86400000).toISOString(), timeZone: 'UTC' }
                }
            });
        }
    }, [isBulkMode, mailboxSettings]);

    // MANUAL INITIALIZATION OF EDITOR CONTENT
    // This is the "Nuclear Stability" fix: only set innerHTML once when data arrives
    useEffect(() => {
        if (mailboxSettings) {
            const intMsg = sanitizeOOO(mailboxSettings.automaticRepliesSetting?.internalReplyMessage || '');
            const extMsg = sanitizeOOO(mailboxSettings.automaticRepliesSetting?.externalReplyMessage || '');
            
            if (internalEditorRef.current) internalEditorRef.current.innerHTML = intMsg;
            if (externalEditorRef.current) externalEditorRef.current.innerHTML = extMsg;
        }
    }, [mailboxSettings, activeUserId]);

    const toggleUserSelection = (id: string) => {
        setSelectedUserIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedUserIds.length === filteredUsers.length) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(filteredUsers.map(u => u.id));
        }
    };

    const handleSaveOOO = async () => {
        if (selectedUserIds.length === 0 || !mailboxSettings) return;
        
        // Grab final values from refs
        const internalHtml = internalEditorRef.current?.innerHTML || '';
        const externalHtml = externalEditorRef.current?.innerHTML || '';

        setSavingMailbox(true);
        setSyncProgress({ current: 0, total: selectedUserIds.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < selectedUserIds.length; i++) {
            const id = selectedUserIds[i];
            setSyncProgress({ current: i + 1, total: selectedUserIds.length });
            
            try {
                const res = await fetch(`/api/users/${id}/mailbox`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        automaticRepliesSetting: {
                            ...mailboxSettings.automaticRepliesSetting,
                            internalReplyMessage: internalHtml,
                            externalReplyMessage: externalHtml
                        }
                    }),
                });
                if (res.ok) {
                    successCount++;
                    setOooStatusMap(prev => ({
                        ...prev,
                        [id]: mailboxSettings.automaticRepliesSetting.status
                    }));
                }
                else failCount++;
            } catch (err) {
                failCount++;
            }
        }

        setSavingMailbox(false);
        setSyncProgress(null);
        alert(`OOO Sync Complete!\n✅ ${successCount} updated\n❌ ${failCount} failed`);
        if (selectedUserIds.length === 1) setSelectedUserIds([]);
    };

    const fonts = [
        'Inter, sans-serif',
        'Roboto, sans-serif',
        'Arial, sans-serif',
        'Times New Roman, serif',
        'Courier New, monospace',
        'Georgia, serif'
    ];

    const fontSizes = ['10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt'];

    const applyCommand = (command: string, value: string) => {
        try { document.execCommand(command, false, value); }
        catch (e) { console.error('Editor Error:', e); }
    };

    function sanitizeOOO(html: any) {
        if (!html || typeof html !== 'string') return '';
        if (html.includes('<body')) {
            const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            if (match) return match[1];
        }
        return html;
    }

    const RichTextToolbar = ({ onCommand }: { onCommand: (cmd: string, val: string) => void }) => (
        <div className="flex items-center gap-4 p-3 bg-slate-900 border-b border-slate-800 rounded-t-2xl shadow-inner group">
            <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
                <div className="p-1 px-2 bg-blue-600/10 rounded-md text-blue-400"><Type size={14} /></div>
                <select 
                    onChange={(e) => onCommand('fontName', e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] font-black uppercase py-1.5 px-3 rounded-lg focus:border-blue-500 outline-none"
                >
                    <option value="">Font Family</option>
                    {fonts.map(f => (<option key={f} value={f} style={{ fontFamily: f }}>{f.split(',')[0]}</option>))}
                </select>
            </div>
            <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
                <div className="p-1 px-2 bg-emerald-600/10 rounded-md text-emerald-400"><FontSizeIcon size={14} /></div>
                <select 
                    onChange={(e) => onCommand('fontSize', e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] font-black uppercase py-1.5 px-3 rounded-lg focus:border-blue-500 outline-none"
                >
                    <option value="">Size</option>
                    {fontSizes.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => onCommand('bold', '')} className="p-2 px-3 text-xs font-black text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">B</button>
                <button onClick={() => onCommand('italic', '')} className="p-2 px-3 text-xs italic font-serif text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">I</button>
                <button onClick={() => onCommand('underline', '')} className="p-2 px-3 text-xs underline text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">U</button>
            </div>
            <div className="ml-auto text-[8px] font-black uppercase tracking-widest text-slate-600">Rich Editor Active</div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-8rem)] -m-8 bg-slate-950 overflow-hidden relative">
            <div className="absolute top-2 right-2 text-[8px] font-black text-slate-800 pointer-events-none z-50">VER-1.2.2-STABILITY-ULTRA</div>

            {/* Left Sidebar */}
            <div className="w-80 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/10 rounded-lg"><Users size={20} className="text-blue-500" /></div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Users</h2>
                        </div>
                        {filteredUsers.length > 0 && (
                            <button onClick={handleSelectAll} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors">
                                {selectedUserIds.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by name..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-600"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {loadingUsers ? (
                        <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
                    ) : filteredUsers.map(user => (
                        <div
                            key={user.id}
                            onClick={() => toggleUserSelection(user.id)}
                            className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                                selectedUserIds.includes(user.id) ? 'bg-blue-600/10 border border-blue-600/30' : 'hover:bg-slate-900 border border-transparent'
                            }`}
                        >
                            <div className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${selectedUserIds.includes(user.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-950 border-slate-800 text-transparent'}`}>
                                <Check size={12} strokeWidth={4} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <div className={`text-sm font-bold truncate ${selectedUserIds.includes(user.id) ? 'text-white' : 'text-slate-200'}`}>{user.displayName}</div>
                                    {oooStatusMap[user.id] && oooStatusMap[user.id] !== 'disabled' && (
                                        <span className="shrink-0 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md">Active</span>
                                    )}
                                </div>
                                <div className="text-[9px] truncate uppercase tracking-tight font-black text-slate-500">{user.jobTitle || 'No Title'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Pane */}
            <div className="flex-1 bg-slate-950 flex flex-col min-w-0">
                <AnimatePresence mode="wait">
                    {selectedUserIds.length === 0 ? (
                        <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                            <Clock size={48} className="text-slate-700" />
                            <h3 className="text-xl font-bold uppercase tracking-tight">Select Users to Begin</h3>
                        </motion.div>
                    ) : (
                        <motion.div key={activeUserId || 'bulk'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col p-8 overflow-y-auto">
                            <header className="flex items-start justify-between mb-12">
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 rounded-2xl shadow-2xl ${isBulkMode ? 'bg-blue-600' : 'bg-slate-900 border border-slate-800'}`}>
                                        {isBulkMode ? <Users size={40} className="text-white" /> : <UserCircle size={40} className="text-blue-500" />}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white tracking-tight uppercase">{isBulkMode ? `Bulk Update: ${selectedUserIds.length} Users` : activeUser?.displayName}</h2>
                                        <p className="text-slate-400 font-medium text-sm">{isBulkMode ? 'Multi-Selection Active' : activeUser?.userPrincipalName}</p>
                                    </div>
                                </div>
                                <button onClick={handleSaveOOO} disabled={savingMailbox || loadingMailbox} className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white font-black uppercase text-xs tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/20">
                                    {savingMailbox ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                    {isBulkMode ? `Apply to ${selectedUserIds.length} Users` : 'Sync to Outlook'}
                                </button>
                            </header>

                            {loadingMailbox ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4"><Loader2 className="animate-spin text-blue-600" size={32} /><p className="text-slate-500">Fetching Exchange Data...</p></div>
                            ) : mailboxSettings ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                    <div className="space-y-8">
                                        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-6">
                                            <div className="flex items-center gap-3 text-lg font-bold text-white uppercase tracking-tight"><RefreshCw size={20} className="text-blue-500" />Auto-Reply Configuration</div>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                                                    <span className="text-sm font-bold text-slate-300">Reply Status</span>
                                                    <select 
                                                        value={mailboxSettings.automaticRepliesSetting?.status || 'disabled'}
                                                        onChange={(e) => setMailboxSettings({...mailboxSettings, automaticRepliesSetting: {...mailboxSettings.automaticRepliesSetting, status: e.target.value}})}
                                                        className="bg-slate-900 border border-slate-800 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl"
                                                    >
                                                        <option value="disabled">Disabled</option><option value="alwaysEnabled">Always Enabled</option><option value="scheduled">Scheduled</option>
                                                    </select>
                                                </div>
                                                {mailboxSettings.automaticRepliesSetting?.status === 'scheduled' && (
                                                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-2 gap-6">
                                                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Start Date</label><input type="datetime-local" value={mailboxSettings.automaticRepliesSetting?.scheduledStartDateTime?.dateTime?.split('.')[0] || ''} onChange={(e) => setMailboxSettings({...mailboxSettings, automaticRepliesSetting: {...mailboxSettings.automaticRepliesSetting, scheduledStartDateTime: {dateTime: e.target.value, timeZone: 'UTC'}}})} className="w-full bg-slate-900 border border-slate-800 text-white text-sm p-3 rounded-xl" /></div>
                                                        <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">End Date</label><input type="datetime-local" value={mailboxSettings.automaticRepliesSetting?.scheduledEndDateTime?.dateTime?.split('.')[0] || ''} onChange={(e) => setMailboxSettings({...mailboxSettings, automaticRepliesSetting: {...mailboxSettings.automaticRepliesSetting, scheduledEndDateTime: {dateTime: e.target.value, timeZone: 'UTC'}}})} className="w-full bg-slate-900 border border-slate-800 text-white text-sm p-3 rounded-xl" /></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-6">
                                            <div className="flex items-center gap-3 text-lg font-bold text-white uppercase tracking-tight"><Mail size={20} className="text-emerald-500" />Message Management</div>
                                            <div className="space-y-8">
                                                <div className="space-y-3">
                                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Internal Message</label>
                                                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                                                        <RichTextToolbar onCommand={applyCommand} />
                                                        <div 
                                                            key={`int-${activeUserId || 'bulk'}`}
                                                            ref={internalEditorRef} 
                                                            contentEditable 
                                                            suppressContentEditableWarning 
                                                            onPaste={(e) => e.stopPropagation()}
                                                            className="w-full min-h-[160px] text-slate-200 text-sm p-6 outline-none overflow-y-auto prose prose-invert prose-sm" 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">External Message</label>
                                                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                                                        <RichTextToolbar onCommand={applyCommand} />
                                                        <div 
                                                            key={`ext-${activeUserId || 'bulk'}`}
                                                            ref={externalEditorRef} 
                                                            contentEditable 
                                                            suppressContentEditableWarning 
                                                            onPaste={(e) => e.stopPropagation()}
                                                            className="w-full min-h-[160px] text-slate-200 text-sm p-6 outline-none overflow-y-auto prose prose-invert prose-sm" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
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
