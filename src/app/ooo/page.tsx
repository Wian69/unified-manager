'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Users, 
    Search, 
    Mail, 
    Calendar as CalendarIcon, 
    Globe, 
    Save, 
    RefreshCw, 
    Loader2, 
    CheckCircle2,
    Clock,
    UserCircle,
    MapPin,
    Filter,
    ShieldAlert,
    Check
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
    const [mailboxSettings, setMailboxSettings] = useState<any>(null);
    const [loadingMailbox, setLoadingMailbox] = useState(false);
    const [savingMailbox, setSavingMailbox] = useState(false);
    const [syncProgress, setSyncProgress] = useState<{ current: number, total: number } | null>(null);

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

    const isBulkMode = selectedUserIds.length > 1;
    const activeUserId = selectedUserIds.length === 1 ? selectedUserIds[0] : null;
    const activeUser = useMemo(() => users.find(u => u.id === activeUserId), [users, activeUserId]);

    // Fetch Mailbox Settings when a SINGLE user is selected
    useEffect(() => {
        if (!activeUserId) {
            // In bulk mode or no selection, we start with an empty template if mailboxSettings is null
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
                        automaticRepliesSetting: mailboxSettings.automaticRepliesSetting
                    }),
                });
                if (res.ok) successCount++;
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

    return (
        <div className="flex h-[calc(100vh-8rem)] -m-8 bg-slate-950 overflow-hidden">
            {/* Left Sidebar: User List */}
            <div className="w-80 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/10 rounded-lg">
                                <Users size={20} className="text-blue-500" />
                            </div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Users</h2>
                        </div>
                        {filteredUsers.length > 0 && (
                            <button 
                                onClick={handleSelectAll}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors"
                            >
                                {selectedUserIds.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input 
                                type="text"
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-600 transition-all"
                            />
                        </div>

                        {/* Region Filter Bar */}
                        <div className="flex flex-wrap gap-2">
                            {REGIONS.map(region => (
                                <button
                                    key={region}
                                    onClick={() => setFilterRegion(region)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border ${
                                        filterRegion === region 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/40' 
                                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                                    }`}
                                >
                                    {region}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {loadingUsers ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center p-12 text-slate-600 text-sm">No users found</div>
                    ) : filteredUsers.map(user => (
                        <div
                            key={user.id}
                            className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all ${
                                selectedUserIds.includes(user.id)
                                ? 'bg-blue-600/10 border border-blue-600/30' 
                                : 'hover:bg-slate-900 border border-transparent'
                            }`}
                        >
                            <button 
                                onClick={() => toggleUserSelection(user.id)}
                                className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                    selectedUserIds.includes(user.id)
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-slate-950 border-slate-800 text-transparent group-hover:border-slate-600'
                                }`}
                            >
                                <Check size={12} strokeWidth={4} />
                            </button>
                            
                            <button 
                                onClick={() => setSelectedUserIds([user.id])}
                                className="flex-1 min-w-0 text-left"
                            >
                                <div className={`text-sm font-bold truncate ${selectedUserIds.includes(user.id) ? 'text-white' : 'text-slate-200'}`}>
                                    {user.displayName}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-[9px] truncate uppercase tracking-tight font-black text-slate-500">
                                        {user.jobTitle || 'No Title'}
                                    </div>
                                    {user.officeLocation && (
                                        <>
                                            <span className="w-1 h-1 bg-slate-800 rounded-full" />
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600">
                                                <MapPin size={8} /> {user.officeLocation}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Pane: Editor */}
            <div className="flex-1 bg-slate-950 flex flex-col min-w-0">
                <AnimatePresence mode="wait">
                    {selectedUserIds.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4"
                        >
                            <div className="p-6 bg-slate-900 rounded-full">
                                <Clock size={48} className="text-slate-700" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-300 uppercase tracking-tight">Select Users to Begin</h3>
                                <p className="max-w-[280px] text-sm mt-2">Choose users from the left panel to update their Outlook auto-replies.</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key={isBulkMode ? 'bulk' : activeUserId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-1 flex flex-col p-8 overflow-y-auto"
                        >
                            <header className="flex items-start justify-between mb-12">
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 rounded-2xl shadow-2xl ${isBulkMode ? 'bg-blue-600' : 'bg-slate-900 border border-slate-800'}`}>
                                        {isBulkMode ? <Users size={40} className="text-white" /> : <UserCircle size={40} className="text-blue-500" />}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                                            {isBulkMode ? `Bulk Update: ${selectedUserIds.length} Users` : activeUser?.displayName}
                                        </h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            {isBulkMode ? (
                                                <span className="text-blue-500 font-black text-[10px] uppercase tracking-widest bg-blue-600/10 px-3 py-1 rounded-full">Multi-Selection Active</span>
                                            ) : (
                                                <>
                                                    <span className="text-slate-400 font-medium">{activeUser?.userPrincipalName}</span>
                                                    <span className="w-1 h-1 bg-slate-800 rounded-full" />
                                                    <span className="text-blue-500 font-black text-[10px] uppercase tracking-widest">{activeUser?.officeLocation || 'Remote'}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={handleSaveOOO}
                                        disabled={savingMailbox || loadingMailbox}
                                        className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
                                    >
                                        {savingMailbox ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                        {isBulkMode ? 'Apply to Group' : 'Sync to Outlook'}
                                    </button>
                                    
                                    {syncProgress && (
                                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2 border border-slate-800">
                                            <motion.div 
                                                className="bg-emerald-500 h-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </header>

                            {loadingMailbox ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
                                    <Loader2 className="animate-spin text-blue-600" size={32} />
                                    <p className="text-slate-500 animate-pulse font-medium">Fetching Exchange Data...</p>
                                </div>
                            ) : mailboxSettings ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                    <div className="space-y-8">
                                        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-600/10 rounded-lg">
                                                    <RefreshCw size={20} className="text-blue-500" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Auto-Reply Configuration</h3>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                                                    <span className="text-sm font-bold text-slate-300">Reply Status</span>
                                                    <select 
                                                        value={mailboxSettings.automaticRepliesSetting?.status || 'disabled'}
                                                        onChange={(e) => setMailboxSettings({
                                                            ...mailboxSettings,
                                                            automaticRepliesSetting: {
                                                                ...mailboxSettings.automaticRepliesSetting,
                                                                status: e.target.value
                                                            }
                                                        })}
                                                        className="bg-slate-900 border border-slate-800 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl focus:outline-none focus:border-blue-600"
                                                    >
                                                        <option value="disabled">Disabled</option>
                                                        <option value="alwaysEnabled">Always Enabled</option>
                                                        <option value="scheduled">Scheduled</option>
                                                    </select>
                                                </div>

                                                {mailboxSettings.automaticRepliesSetting?.status === 'scheduled' && (
                                                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-6">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Start Date</label>
                                                                <input 
                                                                    type="datetime-local"
                                                                    value={mailboxSettings.automaticRepliesSetting?.scheduledStartDateTime?.dateTime?.split('.')[0] || ''}
                                                                    onChange={(e) => setMailboxSettings({
                                                                        ...mailboxSettings,
                                                                        automaticRepliesSetting: {
                                                                            ...mailboxSettings.automaticRepliesSetting,
                                                                            scheduledStartDateTime: { dateTime: e.target.value, timeZone: 'UTC' }
                                                                        }
                                                                    })}
                                                                    className="w-full bg-slate-900 border border-slate-800 text-white text-sm p-3 rounded-xl"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">End Date</label>
                                                                <input 
                                                                    type="datetime-local"
                                                                    value={mailboxSettings.automaticRepliesSetting?.scheduledEndDateTime?.dateTime?.split('.')[0] || ''}
                                                                    onChange={(e) => setMailboxSettings({
                                                                        ...mailboxSettings,
                                                                        automaticRepliesSetting: {
                                                                            ...mailboxSettings.automaticRepliesSetting,
                                                                            scheduledEndDateTime: { dateTime: e.target.value, timeZone: 'UTC' }
                                                                        }
                                                                    })}
                                                                    className="w-full bg-slate-900 border border-slate-800 text-white text-sm p-3 rounded-xl"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {isBulkMode && (
                                            <div className="p-6 bg-blue-600/5 border border-blue-600/20 rounded-3xl flex gap-4">
                                                <div className="shrink-0 p-3 bg-blue-600/10 rounded-2xl h-fit text-blue-500 font-black text-xl">
                                                    !
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">Bulk Mode Active</h4>
                                                    <p className="text-xs text-slate-400 leading-relaxed text-balance">
                                                        You are about to overwrite the Out of Office settings for <strong>{selectedUserIds.length} users</strong>. This will replace their current messages and schedules immediately.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-600/10 rounded-lg">
                                                    <Mail size={20} className="text-emerald-500" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Message Management</h3>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Internal Message (Colleagues)</label>
                                                    <textarea 
                                                        value={mailboxSettings.automaticRepliesSetting?.internalReplyMessage || ''}
                                                        onChange={(e) => setMailboxSettings({
                                                            ...mailboxSettings,
                                                            automaticRepliesSetting: {
                                                                ...mailboxSettings.automaticRepliesSetting,
                                                                internalReplyMessage: e.target.value
                                                            }
                                                        })}
                                                        className="w-full h-40 bg-slate-950 border border-slate-800 text-slate-200 text-sm p-4 rounded-2xl focus:border-blue-600 outline-none resize-none"
                                                        placeholder="Write the internal reply..."
                                                    />
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">External Message (Public)</label>
                                                    <textarea 
                                                        value={mailboxSettings.automaticRepliesSetting?.externalReplyMessage || ''}
                                                        onChange={(e) => setMailboxSettings({
                                                            ...mailboxSettings,
                                                            automaticRepliesSetting: {
                                                                ...mailboxSettings.automaticRepliesSetting,
                                                                externalReplyMessage: e.target.value
                                                            }
                                                        })}
                                                        className="w-full h-40 bg-slate-950 border border-slate-800 text-slate-200 text-sm p-4 rounded-2xl focus:border-blue-600 outline-none resize-none"
                                                        placeholder="Write the public reply..."
                                                    />
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
