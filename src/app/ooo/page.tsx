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
    ChevronRight,
    UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
    id: string;
    displayName: string;
    userPrincipalName: string;
    jobTitle?: string;
    officeLocation?: string;
}

export default function OOOManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    
    const [mailboxSettings, setMailboxSettings] = useState<any>(null);
    const [loadingMailbox, setLoadingMailbox] = useState(false);
    const [savingMailbox, setSavingMailbox] = useState(false);

    // Fetch Users
    useEffect(() => {
        fetch('/api/users')
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
        return users.filter(u => 
            u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.userPrincipalName.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [users, searchQuery]);

    const selectedUser = useMemo(() => {
        return users.find(u => u.id === selectedUserId);
    }, [users, selectedUserId]);

    // Fetch Mailbox Settings when user is selected
    useEffect(() => {
        if (!selectedUserId) {
            setMailboxSettings(null);
            return;
        }

        setLoadingMailbox(true);
        fetch(`/api/users/${selectedUserId}/mailbox?t=${Date.now()}`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) setMailboxSettings(data);
                setLoadingMailbox(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingMailbox(false);
            });
    }, [selectedUserId]);

    const handleSaveOOO = async () => {
        if (!selectedUserId || !mailboxSettings) return;
        setSavingMailbox(true);
        try {
            const res = await fetch(`/api/users/${selectedUserId}/mailbox`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    automaticRepliesSetting: mailboxSettings.automaticRepliesSetting
                }),
            });
            if (!res.ok) throw new Error("Failed to update settings");
            alert("Success: OOO settings updated for " + selectedUser?.displayName);
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setSavingMailbox(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] -m-8 bg-slate-950 overflow-hidden">
            {/* Left Sidebar: User List */}
            <div className="w-80 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-900 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/10 rounded-lg">
                            <Users size={20} className="text-blue-500" />
                        </div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Users</h2>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text"
                            placeholder="Find a user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-600 transition-all shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {loadingUsers ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                        </div>
                    ) : filteredUsers.map(user => (
                        <button
                            key={user.id}
                            onClick={() => setSelectedUserId(user.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                                selectedUserId === user.id 
                                ? 'bg-blue-600 shadow-lg shadow-blue-900/20' 
                                : 'hover:bg-slate-900'
                            }`}
                        >
                            <div className={`p-2 rounded-lg ${selectedUserId === user.id ? 'bg-white/20' : 'bg-slate-800'}`}>
                                <UserCircle size={18} className={selectedUserId === user.id ? 'text-white' : 'text-slate-400'} />
                            </div>
                            <div className="min-w-0">
                                <div className={`text-sm font-bold truncate ${selectedUserId === user.id ? 'text-white' : 'text-slate-200'}`}>
                                    {user.displayName}
                                </div>
                                <div className={`text-[10px] truncate uppercase tracking-tight font-black ${selectedUserId === user.id ? 'text-blue-100' : 'text-slate-500'}`}>
                                    {user.jobTitle || 'No Title'}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Pane: Editor */}
            <div className="flex-1 bg-slate-950 flex flex-col min-w-0">
                <AnimatePresence mode="wait">
                    {!selectedUserId ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4"
                        >
                            <div className="p-6 bg-slate-900 rounded-full">
                                <Clock size={48} className="text-slate-700" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-300">Out of Office Manager</h3>
                                <p className="max-w-[280px]">Select a user from the left to manage their auto-replies.</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key={selectedUserId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex-1 flex flex-col p-8 overflow-y-auto"
                        >
                            <header className="flex items-start justify-between mb-12">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-blue-600 rounded-2xl shadow-2xl shadow-blue-600/20">
                                        <UserCircle size={40} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white tracking-tight uppercase">{selectedUser?.displayName}</h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-slate-400 font-medium">{selectedUser?.userPrincipalName}</span>
                                            <span className="w-1 h-1 bg-slate-800 rounded-full" />
                                            <span className="text-blue-500 font-black text-[10px] uppercase tracking-widest">{selectedUser?.jobTitle || 'User'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={handleSaveOOO}
                                    disabled={savingMailbox || loadingMailbox}
                                    className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
                                >
                                    {savingMailbox ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                    Sync to Outlook
                                </button>
                            </header>

                            {loadingMailbox ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
                                    <Loader2 className="animate-spin text-blue-600" size={32} />
                                    <p className="text-slate-500 animate-pulse font-medium">Reading Outlook Mailbox Configuration...</p>
                                </div>
                            ) : mailboxSettings ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                    {/* Settings Left */}
                                    <div className="space-y-8">
                                        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-600/10 rounded-lg">
                                                    <RefreshCw size={20} className="text-blue-500" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Auto-Reply Logic</h3>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full ${mailboxSettings.automaticRepliesSetting?.status !== 'disabled' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                                        <span className="text-sm font-bold text-slate-300">Mode</span>
                                                    </div>
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
                                                        <option value="disabled">Inactive</option>
                                                        <option value="alwaysEnabled">Persistent</option>
                                                        <option value="scheduled">Timed Schedule</option>
                                                    </select>
                                                </div>

                                                {mailboxSettings.automaticRepliesSetting?.status === 'scheduled' && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-6"
                                                    >
                                                        <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                                                            <CalendarIcon size={14} /> Schedule Duration (UTC)
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-slate-500 ml-1">Departure</label>
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
                                                                    className="w-full bg-slate-900 border border-slate-800 text-white text-sm p-3 rounded-xl focus:border-blue-600 outline-none"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-slate-500 ml-1">Return</label>
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
                                                                    className="w-full bg-slate-900 border border-slate-800 text-white text-sm p-3 rounded-xl focus:border-blue-600 outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-6 bg-blue-600/5 border border-blue-600/20 rounded-3xl flex gap-4">
                                            <div className="shrink-0 p-3 bg-blue-600/10 rounded-2xl h-fit">
                                                <RefreshCw size={24} className="text-blue-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-bold text-white uppercase tracking-tight">Sync Notice</h4>
                                                <p className="text-xs text-slate-400 leading-relaxed">
                                                    Updating these settings will immediately push changes to the user's Exchange mailbox. 
                                                    Automated systems (Mimecast/Proofpoint) may also inherit these settings depending on your organization rules.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Messages Right */}
                                    <div className="space-y-6">
                                        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-600/10 rounded-lg">
                                                    <Mail size={20} className="text-emerald-500" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Response Content</h3>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between px-1">
                                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Internal Message</label>
                                                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-500/10 px-2 py-0.5 rounded-full">Colleagues Only</span>
                                                    </div>
                                                    <textarea 
                                                        value={mailboxSettings.automaticRepliesSetting?.internalReplyMessage || ''}
                                                        onChange={(e) => setMailboxSettings({
                                                            ...mailboxSettings,
                                                            automaticRepliesSetting: {
                                                                ...mailboxSettings.automaticRepliesSetting,
                                                                internalReplyMessage: e.target.value
                                                            }
                                                        })}
                                                        className="w-full h-40 bg-slate-950 border border-slate-800 text-slate-200 text-sm p-4 rounded-2xl focus:border-blue-600 outline-none resize-none transition-all"
                                                        placeholder="Write your internal auto-reply message here..."
                                                    />
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between px-1">
                                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">External Message</label>
                                                        <div className="flex items-center gap-2">
                                                            <Globe size={12} className="text-slate-600" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter bg-slate-800 px-2 py-0.5 rounded-full">Public Audience</span>
                                                        </div>
                                                    </div>
                                                    <textarea 
                                                        value={mailboxSettings.automaticRepliesSetting?.externalReplyMessage || ''}
                                                        onChange={(e) => setMailboxSettings({
                                                            ...mailboxSettings,
                                                            automaticRepliesSetting: {
                                                                ...mailboxSettings.automaticRepliesSetting,
                                                                externalReplyMessage: e.target.value
                                                            }
                                                        })}
                                                        className="w-full h-40 bg-slate-950 border border-slate-800 text-slate-200 text-sm p-4 rounded-2xl focus:border-blue-600 outline-none resize-none transition-all"
                                                        placeholder="Write your public/external auto-reply message here..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-20 bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-900">
                                    <ShieldAlert size={48} className="text-slate-800 mb-4" />
                                    <h3 className="text-xl font-bold text-slate-400">Mailbox Inaccessible</h3>
                                    <p className="max-w-md text-center text-sm leading-relaxed mt-2">
                                        Could not retrieve mailbox settings for this user. This usually happens if the user does not have an active Exchange Online license or their mailbox is still being provisioned.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #334155;
                }
            `}</style>
        </div>
    );
}

// Add ShieldAlert to imports
import { ShieldAlert } from 'lucide-react';
