"use client";

import { useEffect, useState } from "react";
import { Users, RefreshCw } from "lucide-react";

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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
                                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
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
        </div>
    );
}
