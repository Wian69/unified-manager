"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, RefreshCw, ShieldAlert, FileText, Activity, Trash2, User } from "lucide-react";
import Link from "next/link";
import SharePointDeletionsModule from "@/components/SharePointDeletionsModule";
import ActivityCard from "@/components/ActivityCard";

export default function UserOffboardingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // SharePoint Audit State
    const [recycleBinItems, setRecycleBinItems] = useState<any[]>([]);
    const [loadingSP, setLoadingSP] = useState(false);
    const [spError, setSpError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch User Details
            const userRes = await fetch(`/api/users/${id}`);
            const userData = await userRes.json();
            if (userData.error) throw new Error(userData.error);
            setUser(userData);

            // Fetch SharePoint Deletions
            setLoadingSP(true);
            const spRes = await fetch(`/api/sharepoint/deleted?userId=${id}`);
            const spData = await spRes.json();
            if (spData.error) {
                setSpError(spData.error);
            } else {
                setRecycleBinItems(spData.items || []);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingSP(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 gap-4">
                <RefreshCw size={40} className="animate-spin text-blue-500" />
                <p className="font-mono text-sm uppercase tracking-widest">Loading Employee Profile...</p>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="p-12 text-center">
                <ShieldAlert className="mx-auto text-rose-500 mb-4" size={64} />
                <h2 className="text-2xl font-bold text-white mb-4">Profile Unavailable</h2>
                <p className="text-slate-400 mb-8">{error || "User not found"}</p>
                <Link href="/offboarding" className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 font-bold">
                    <ArrowLeft size={20} /> Back to Offboarding Monitor
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-12 animate-in fade-in duration-700">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
                <Link href="/offboarding" className="group flex items-center gap-3 text-slate-400 hover:text-white transition-all">
                    <div className="p-2 bg-slate-900 rounded-xl group-hover:bg-slate-800 border border-slate-800 group-hover:border-slate-700 transition-all">
                        <ArrowLeft size={20} />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-widest">Offboarding Monitor</span>
                </Link>
                <div className="flex items-center gap-4">
                     <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                        Offboarding in Progress
                     </span>
                </div>
            </div>

            {/* Profile Overview Card */}
            <div className="bg-slate-950/50 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl">
                        {user.displayName.charAt(0)}
                    </div>
                    <div className="text-center md:text-left space-y-2">
                        <h1 className="text-4xl font-black text-white tracking-tight">{user.displayName}</h1>
                        <p className="text-lg text-slate-400 font-mono">{user.userPrincipalName}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                                <User size={12} className="text-blue-500" />
                                {user.jobTitle || "Employee"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                                <Activity size={12} className="text-emerald-500" />
                                {user.department || "General"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Audit and Activity Section */}
                <div className="lg:col-span-2 space-y-12">
                    <section>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <Trash2 size={24} className="text-blue-500" />
                                SharePoint Data Recovery
                            </h2>
                        </div>
                        <div className="bg-slate-900/40 rounded-[2rem] border border-slate-800/60 p-2 backdrop-blur-md">
                            <SharePointDeletionsModule 
                                selectedUser={user} 
                                recycleBinItems={recycleBinItems}
                                loadingDetails={loadingSP}
                                error={spError}
                            />
                        </div>
                    </section>

                    <section className="bg-slate-950/50 p-10 rounded-[2.5rem] border border-slate-800">
                        <h3 className="text-xl font-bold text-white mb-8">Data Exfiltration Risk Context</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-blue-500/30 transition-all">
                                <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-3">Access Anomalies</p>
                                <p className="text-slate-200 text-sm leading-relaxed">System flag: High volume of data synchronization detected across personal OneDrive folders outside business hours.</p>
                            </div>
                            <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition-all">
                                <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-3">Endpoint Compliance</p>
                                <p className="text-emerald-400 font-bold flex items-center gap-2">
                                    <ShieldAlert size={16} /> Fully Compliant
                                </p>
                                <p className="text-slate-500 text-[10px] mt-2 italic">Last security check: 4 minutes ago</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar Details */}
                <div className="space-y-12">
                    <section className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-8 backdrop-blur-md">
                        <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3 uppercase tracking-tighter">
                            <Activity size={20} className="text-blue-400" />
                            Live Telemetry Feed
                        </h3>
                        <div className="space-y-6">
                            <ActivityCard 
                                title="Bulk File Encryption/ZIP" 
                                device="MACBOOK-PRO-M3" 
                                time="Today, 10:45 AM" 
                                severity="critical" 
                            />
                            <ActivityCard 
                                title="Removable Storage Detected" 
                                device="MACBOOK-PRO-M3" 
                                time="Today, 09:12 AM" 
                                severity="high" 
                            />
                            <ActivityCard 
                                title="Cloud Storage Sync (External)" 
                                device="MACBOOK-PRO-M3" 
                                time="Yesterday, 4:30 PM" 
                                severity="high" 
                            />
                        </div>
                    </section>

                    <section className="bg-slate-950/50 rounded-[2.5rem] border border-slate-800 p-8">
                         <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tighter">System Notes</h3>
                         <div className="space-y-4">
                            <div className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-blue-500 pl-4">
                                "Account flagged for review prior to departure on 2026-04-01. Manager requested full SharePoint deletion report."
                            </div>
                         </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
