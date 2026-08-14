"use client";

import { useState, useEffect } from "react";
import { Users, Loader2, Calendar, Search } from "lucide-react";

export default function SignInReportPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetch("/api/users/sign-ins")
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setUsers(data.users || []);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const filteredUsers = users.filter(u => 
        u.displayName.toLowerCase().includes(search.toLowerCase()) || 
        u.userPrincipalName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Users className="text-blue-500" size={24} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white">Partner Sign-In Report</h1>
                    </div>
                    <p className="text-slate-400">View the last sign-in dates for all @partner.eqncs.com accounts.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search partners..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-2 outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p>Fetching sign-in logs from Azure...</p>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-rose-400">
                        <p className="font-bold text-lg mb-2">Failed to load data</p>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/50">
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Sign-In Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredUsers.map((u, i) => (
                                    <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4 font-medium text-slate-200">
                                            {u.displayName}
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm">
                                            {u.userPrincipalName}
                                        </td>
                                        <td className="p-4">
                                            {u.lastSignIn ? (
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Calendar size={14} className="text-blue-400" />
                                                    {new Date(u.lastSignIn).toLocaleString()}
                                                </div>
                                            ) : (
                                                <span className="text-xs font-medium px-2 py-1 bg-slate-800 text-slate-400 rounded-md">
                                                    Never / No Data
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-slate-500">
                                            No partners found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
