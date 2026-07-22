"use client";

import { useState, useEffect } from "react";
import { Copy, HardDrive, CheckCircle2, ChevronRight, Loader2, ArrowRight } from "lucide-react";

export default function MailMigrationPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    
    const [sourceUser, setSourceUser] = useState("");
    const [targetUser, setTargetUser] = useState("");
    
    const [folders, setFolders] = useState<any[]>([]);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
    const [recursive, setRecursive] = useState(true);

    const [migrating, setMigrating] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                const data = await res.json();
                if (data.users) {
                    setUsers(data.users.sort((a: any, b: any) => a.displayName.localeCompare(b.displayName)));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        if (!sourceUser) {
            setFolders([]);
            setSelectedFolders([]);
            return;
        }

        const fetchFolders = async () => {
            setLoadingFolders(true);
            try {
                const res = await fetch(`/api/mail/folders?userId=${sourceUser}`);
                const data = await res.json();
                if (data.folders) {
                    setFolders(data.folders);
                } else {
                    setFolders([]);
                }
            } catch (e) {
                console.error(e);
                setFolders([]);
            } finally {
                setLoadingFolders(false);
            }
        };
        fetchFolders();
    }, [sourceUser]);

    const handleStartMigration = async () => {
        if (!sourceUser || !targetUser || selectedFolders.length === 0) return;
        
        setMigrating(true);
        setSuccessMsg("");
        setErrorMsg("");
        
        try {
            const res = await fetch('/api/mail/copy-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceUser,
                    targetUser,
                    sourceFolderIds: selectedFolders,
                    recursive
                })
            });
            
            const data = await res.json();
            if (data.success) {
                setSuccessMsg("Migration started successfully! The process is running in the background and might take several minutes to complete depending on the folder size.");
                setSelectedFolders([]);
            } else {
                setErrorMsg(data.error || "Failed to start migration");
            }
        } catch (e: any) {
            setErrorMsg(e.message || "Network error");
        } finally {
            setMigrating(false);
        }
    };

    const toggleFolderSelection = (folderId: string) => {
        if (selectedFolders.includes(folderId)) {
            setSelectedFolders(selectedFolders.filter(id => id !== folderId));
        } else {
            setSelectedFolders([...selectedFolders, folderId]);
        }
    };

    const toggleSelectAllFolders = () => {
        if (selectedFolders.length === folders.length) {
            setSelectedFolders([]);
        } else {
            setSelectedFolders(folders.map(f => f.id));
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Copy className="text-blue-500" size={24} />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white">Mail Migration</h1>
                </div>
                <p className="text-slate-400">Copy Outlook folders seamlessly from one mailbox to another.</p>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 md:p-8 space-y-8">
                    
                    {/* Source Selection */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs">1</span>
                            Source Mailbox
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Select User</label>
                                <select
                                    value={sourceUser}
                                    onChange={(e) => setSourceUser(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                                    disabled={loadingUsers}
                                >
                                    <option value="">{loadingUsers ? "Loading users..." : "Select source..."}</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.userPrincipalName}>{u.displayName} ({u.userPrincipalName})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {sourceUser && (
                            <div className="ml-8 mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase">Select Folders to Copy</label>
                                    {folders.length > 0 && (
                                        <button 
                                            onClick={toggleSelectAllFolders}
                                            className="text-xs font-bold text-blue-500 hover:text-blue-400"
                                        >
                                            {selectedFolders.length === folders.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    )}
                                </div>
                                <div className="relative border border-slate-800 rounded-lg bg-slate-950 overflow-hidden h-64">
                                    {loadingFolders ? (
                                        <div className="flex items-center justify-center h-full text-slate-500">
                                            <Loader2 size={24} className="animate-spin text-blue-500 mr-2" />
                                            Fetching folders...
                                        </div>
                                    ) : folders.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                                            No folders found.
                                        </div>
                                    ) : (
                                        <div className="overflow-y-auto h-full p-2 space-y-1">
                                            {folders.map(f => (
                                                <label 
                                                    key={f.id} 
                                                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedFolders.includes(f.id) ? 'bg-blue-500/10' : 'hover:bg-slate-900'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${selectedFolders.includes(f.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-600'}`}>
                                                        {selectedFolders.includes(f.id) && <CheckCircle2 size={12} className="text-white" />}
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        className="hidden" 
                                                        checked={selectedFolders.includes(f.id)} 
                                                        onChange={() => toggleFolderSelection(f.id)} 
                                                    />
                                                    <span className="text-sm text-slate-300 truncate font-medium">
                                                        {f.path} <span className="text-slate-500 font-normal ml-1">({f.totalItemCount} items)</span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedFolders.length > 0 && (
                                    <p className="text-xs text-blue-400 mt-2 font-medium">
                                        {selectedFolders.length} folder(s) selected
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center ml-8">
                        <ArrowRight className="text-slate-700" />
                    </div>

                    {/* Target Selection */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs">2</span>
                            Destination Mailbox
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Select Target User</label>
                                <select
                                    value={targetUser}
                                    onChange={(e) => setTargetUser(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                                    disabled={loadingUsers}
                                >
                                    <option value="">Select target...</option>
                                    {users.filter(u => u.userPrincipalName !== sourceUser).map(u => (
                                        <option key={u.id} value={u.userPrincipalName}>{u.displayName} ({u.userPrincipalName})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="h-px w-full bg-slate-800/50 my-6"></div>

                    {/* Options & Action */}
                    <div className="space-y-6 ml-8">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${recursive ? 'bg-blue-600 border-blue-600' : 'border-slate-600 group-hover:border-slate-500'}`}>
                                {recursive && <CheckCircle2 size={14} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={recursive} onChange={(e) => setRecursive(e.target.checked)} />
                            <span className="text-sm text-slate-300">Include Subfolders recursively</span>
                        </label>

                        {successMsg && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg flex items-start gap-3">
                                <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="font-bold">Migration Queued</p>
                                    <p className="opacity-90">{successMsg}</p>
                                </div>
                            </div>
                        )}

                        {errorMsg && (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg">
                                {errorMsg}
                            </div>
                        )}

                        <button 
                            onClick={handleStartMigration}
                            disabled={!sourceUser || !targetUser || selectedFolders.length === 0 || migrating}
                            className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white px-8 py-4 rounded-xl font-black tracking-wide uppercase text-sm transition-all shadow-xl shadow-blue-900/20 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {migrating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Starting Migration...
                                </>
                            ) : (
                                <>
                                    Start Background Migration
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </div>

                </div>
                
                <div className="bg-slate-950/50 p-6 border-t border-slate-800 text-xs text-slate-500 leading-relaxed">
                    <strong>Note:</strong> Emails are copied preserving their original subject, sender, and received timestamps. Due to Graph API limitations, they will appear in the target mailbox as new items. For massive mailboxes, please monitor the backend server logs for full completion status.
                </div>
            </div>
        </div>
    );
}
