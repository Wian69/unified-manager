'use client';
import { useState, useEffect } from 'react';
import { FileSignature, ShieldCheck, Mail, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ExternalSharesPage() {
    const [shares, setShares] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [targetUrl, setTargetUrl] = useState('https://xxeqncs.sharepoint.com/teams/SharesForexternalusers/SitePages/CollabHome.aspx');
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
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShares();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;

        setIsInviting(true);
        setError(null);

        try {
            const res = await fetch('/api/sharepoint/external-shares', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, targetUrl })
            });
            const data = await res.json();
            
            if (!res.ok) {
                setError(data.error || 'Failed to send invite');
            } else {
                setNewEmail('');
                // We keep targetUrl as is for convenience in case they want to share the same folder with someone else
                fetchShares();
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsInviting(false);
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Invite Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-8 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-400" />
                                Invite New Guest
                            </h2>
                            <p className="text-sm text-slate-400 mb-6">
                                The user will be emailed a unique link to electronically sign the Terms of Use before gaining access.
                            </p>
                            
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">External Email Address</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        placeholder="guest@company.com"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Target Folder URL</label>
                                    <input 
                                        type="url" 
                                        required
                                        value={targetUrl}
                                        onChange={e => setTargetUrl(e.target.value)}
                                        placeholder="https://company.sharepoint.com/teams/..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 text-sm"
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
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
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

                    {/* Pending & Active Shares */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-6">Audit Trail & Access Status</h2>
                            
                            {isLoading ? (
                                <div className="text-center py-12 text-slate-500">Loading records...</div>
                            ) : shares.length === 0 ? (
                                <div className="text-center py-16 bg-slate-950/50 rounded-xl border border-slate-800/50">
                                    <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-400 font-medium">No external shares found</p>
                                    <p className="text-sm text-slate-500 mt-1">Invite a guest to start generating an audit trail.</p>
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
                                                    <p className="text-xs text-blue-400 mt-1 truncate max-w-xs sm:max-w-md" title={share.targetUrl}>
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
                                            
                                            {share.status === 'Accepted' && (
                                                <div className="text-right shrink-0">
                                                    <span className="inline-block px-3 py-1 bg-slate-800 rounded-lg text-xs font-medium text-slate-300 font-mono">
                                                        IP: {share.ipAddress}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
