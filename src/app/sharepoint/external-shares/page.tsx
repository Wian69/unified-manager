'use client';
import { useState, useEffect } from 'react';
import { FileSignature, ShieldCheck, Mail, Clock, CheckCircle2, AlertCircle, Folder, X, RefreshCw, Trash2 } from 'lucide-react';

export default function ExternalSharesPage() {
    const [shares, setShares] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [isLoadingShares, setIsLoadingShares] = useState(true);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    
    // Modal state
    const [selectedFolder, setSelectedFolder] = useState<any | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchShares = async () => {
        try {
            const res = await fetch('/api/sharepoint/external-shares');
            const data = await res.json();
            if (data.shares) setShares(data.shares);
        } catch (e) {
            console.error("Failed to fetch shares", e);
        } finally {
            setIsLoadingShares(false);
        }
    };

    const fetchFolders = async () => {
        setIsLoadingFolders(true);
        try {
            const res = await fetch('/api/sharepoint/external-shares/folders');
            const data = await res.json();
            if (data.folders) setFolders(data.folders);
            else if (data.error) console.error(data.error);
        } catch (e) {
            console.error("Failed to fetch folders", e);
        } finally {
            setIsLoadingFolders(false);
        }
    };

    useEffect(() => {
        fetchShares();
        fetchFolders();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !selectedFolder) return;

        setIsInviting(true);
        setError(null);

        try {
            const res = await fetch('/api/sharepoint/external-shares', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, targetUrl: selectedFolder.webUrl })
            });
            const data = await res.json();
            
            if (!res.ok) {
                setError(data.error || 'Failed to send invite');
            } else {
                setNewEmail('');
                setSelectedFolder(null); // Close modal
                fetchShares();
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsInviting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this share and remove it from the audit trail?")) return;
        try {
            const res = await fetch('/api/sharepoint/external-shares', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                fetchShares();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete share');
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-blue-500/30">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <ShieldCheck className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white tracking-tight">Secure External Sharing</h1>
                            <p className="text-slate-400 mt-1 text-lg">Manage access and audit trails for SharesForexternalusers</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* Folders Section */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Folder className="w-5 h-5 text-blue-400" />
                                Available Folders to Share
                            </h2>
                            <button onClick={fetchFolders} className="text-slate-500 hover:text-white transition-colors" title="Refresh Folders">
                                <RefreshCw className={`w-5 h-5 ${isLoadingFolders ? 'animate-spin text-blue-500' : ''}`} />
                            </button>
                        </div>

                        {isLoadingFolders ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />)}
                            </div>
                        ) : folders.length === 0 ? (
                            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500">
                                No folders found in SharesForexternalusers root directory.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {folders.map((folder: any) => (
                                    <div 
                                        key={folder.id}
                                        onClick={() => { setSelectedFolder(folder); setError(null); setNewEmail(''); }}
                                        className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/50 transition-all group flex items-center gap-4"
                                    >
                                        <Folder className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                                        <span className="font-semibold text-white truncate" title={folder.name}>{folder.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending & Active Shares Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-6">Audit Trail & Access Status</h2>
                        
                        {isLoadingShares ? (
                            <div className="text-center py-12 text-slate-500">Loading records...</div>
                        ) : shares.length === 0 ? (
                            <div className="text-center py-16 bg-slate-950/50 rounded-xl border border-slate-800/50">
                                <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium">No external shares found</p>
                                <p className="text-sm text-slate-500 mt-1">Select a folder above to invite a guest and start generating an audit trail.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {shares.map(share => (
                                    <div key={share.id} className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-slate-700">
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 p-2 rounded-full ${
                                                share.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                                {share.status === 'Accepted' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{share.email}</p>
                                                <p className="text-xs text-blue-400 mt-1 truncate max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl" title={share.targetUrl}>
                                                    {share.targetUrl}
                                                </p>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs text-slate-400">
                                                    <span>Invited: {new Date(share.invitedAt).toLocaleString()}</span>
                                                    {share.status === 'Accepted' && (
                                                        <>
                                                            <span className="hidden sm:inline">•</span>
                                                            <span className="text-emerald-400">Signed: {new Date(share.acceptedAt).toLocaleString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 shrink-0">
                                            {share.status === 'Accepted' && (
                                                <div className="text-right">
                                                    <span className="inline-block px-3 py-1 bg-slate-800 rounded-lg text-xs font-medium text-slate-300 font-mono">
                                                        IP: {share.ipAddress}
                                                    </span>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => handleDelete(share.id)}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Revoke and Delete Share"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Invite Modal */}
            {selectedFolder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setSelectedFolder(null)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-400" />
                            Invite to Folder
                        </h2>
                        <div className="mb-6 p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-3">
                            <Folder className="w-5 h-5 text-blue-400 shrink-0" />
                            <span className="text-white font-semibold truncate">{selectedFolder.name}</span>
                        </div>
                        
                        <p className="text-sm text-slate-400 mb-6">
                            The user will be emailed a unique link to electronically sign the Terms of Use before gaining access to this folder.
                        </p>
                        
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">External Email Address</label>
                                <input 
                                    type="email" 
                                    required
                                    autoFocus
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    placeholder="guest@company.com"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={isInviting || !newEmail}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-4"
                            >
                                {isInviting ? (
                                    <>Sending Invite...</>
                                ) : (
                                    <>
                                        <FileSignature className="w-4 h-4" />
                                        Send Secure Invite
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
