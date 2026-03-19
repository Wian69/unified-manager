"use client";

import { useEffect, useState } from "react";
import { Users, RefreshCw, X, Save } from "lucide-react";

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUserClick = async (id: string) => {
        setSelectedUserId(id);
        setLoadingDetails(true);
        try {
            const res = await fetch(`/api/users/${id}`);
            const data = await res.json();
            setSelectedUser(data);
            setEditForm({
                displayName: data.displayName || '',
                jobTitle: data.jobTitle || '',
                department: data.department || '',
                mobilePhone: data.mobilePhone || '',
                officeLocation: data.officeLocation || ''
            });
        } catch (error) {
            console.error("Failed to fetch user details", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSave = async () => {
        if (!selectedUserId) return;
        setSaving(true);
        try {
            await fetch(`/api/users/${selectedUserId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            // Refresh list after save and close modal
            await fetchUsers();
            setSelectedUserId(null);
        } catch (error) {
            console.error("Failed to update user", error);
            alert("Failed to save user changes.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                        <Users size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">User Management</h1>
                        <p className="text-slate-400">View and manage Entra ID accounts.</p>
                    </div>
                </div>
                <button 
                    onClick={fetchUsers}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-700"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 overflow-hidden backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950/50 text-slate-400 uppercase font-medium border-b border-slate-800/60">
                            <tr>
                                <th className="px-6 py-4">Display Name</th>
                                <th className="px-6 py-4">Principal Name</th>
                                <th className="px-6 py-4">Job Title</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : users.length > 0 ? (
                                users.map((u: any) => (
                                    <tr 
                                        key={u.id} 
                                        onClick={() => handleUserClick(u.id)}
                                        className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-200">{u.displayName || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-slate-400">{u.userPrincipalName || 'N/A'}</td>
                                        <td className="px-6 py-4">{u.jobTitle || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.accountEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {u.accountEnabled ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal Overlay */}
            {selectedUserId && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="w-full max-w-md h-full bg-[#0b0f19] border-l border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">Edit User</h2>
                            <button onClick={() => setSelectedUserId(null)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
                                    <RefreshCw className="animate-spin text-purple-400" size={32} />
                                    Loading Entra ID details...
                                </div>
                            ) : selectedUser ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Display Name</label>
                                        <input 
                                            type="text" 
                                            value={editForm.displayName} 
                                            onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Job Title</label>
                                        <input 
                                            type="text" 
                                            value={editForm.jobTitle} 
                                            onChange={(e) => setEditForm({...editForm, jobTitle: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Department</label>
                                        <input 
                                            type="text" 
                                            value={editForm.department} 
                                            onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Mobile Phone</label>
                                        <input 
                                            type="text" 
                                            value={editForm.mobilePhone} 
                                            onChange={(e) => setEditForm({...editForm, mobilePhone: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Office Location</label>
                                        <input 
                                            type="text" 
                                            value={editForm.officeLocation} 
                                            onChange={(e) => setEditForm({...editForm, officeLocation: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-all"
                                        />
                                    </div>
                                    <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                        <p className="text-xs text-slate-400 break-all"><span className="font-semibold text-slate-300">UPN:</span> {selectedUser.userPrincipalName}</p>
                                        <p className="text-xs text-slate-400 break-all mt-1"><span className="font-semibold text-slate-300">ID:</span> {selectedUser.id}</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/20">
                            <button 
                                onClick={handleSave}
                                disabled={saving || loadingDetails}
                                className="w-full flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-50"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                {saving ? "Saving to Entra ID..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
