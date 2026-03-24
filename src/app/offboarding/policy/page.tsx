"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ShieldCheck, Lock, HardDrive, UserCheck, Scale } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

export default function PolicyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs tracking-widest uppercase">Loading Policy Engine...</div>}>
            <PolicyContent />
        </Suspense>
    );
}

function PolicyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get('user');
    const [userName, setUserName] = useState("Employee");

    useEffect(() => {
        if (userId) {
            fetch(`/api/users/${userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.user?.displayName) setUserName(data.user.displayName);
                })
                .catch(() => {});
        }
    }, [userId]);

    const sections = [
        { id: 'overview', title: 'Executive Overview', icon: <FileText size={18} /> },
        { id: 'data', title: 'Data & Privacy', icon: <Lock size={18} /> },
        { id: 'assets', title: 'Asset Recovery', icon: <HardDrive size={18} /> },
        { id: 'access', title: 'Access Revocation', icon: <ShieldCheck size={18} /> },
        { id: 'legal', title: 'Legal & Compliance', icon: <Scale size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
            {/* Top Navigation Bar */}
            <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.back()}
                        className="p-2.5 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white border border-transparent hover:border-slate-700"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest text-white">Equinox Group Holdings, Inc. - IT Exit interview Policy</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Drafting Context: {userName}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        Version 2.4.0 (Active)
                    </span>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12">
                {/* Sidebar Navigation */}
                <aside className="space-y-8 sticky top-32 h-fit">
                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Policy Sections</p>
                        {sections.map((s) => (
                            <a 
                                key={s.id}
                                href={`#${s.id}`}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900 transition-all text-slate-400 hover:text-indigo-400 font-bold text-sm border border-transparent hover:border-slate-800/60 group"
                            >
                                <span className="group-hover:scale-110 transition-transform">{s.icon}</span>
                                {s.title}
                            </a>
                        ))}
                    </div>

                    <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400">
                            <ShieldCheck size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Compliance Status</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                            This document is legally binding and governs all hardware and software reclamation for {userName}.
                        </p>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="space-y-16 pb-32 max-w-3xl">
                    <section id="overview" className="scroll-mt-32 space-y-6">
                        <h2 className="text-3xl font-black text-white tracking-tight">Executive Overview</h2>
                        <div className="prose prose-invert prose-slate max-w-none text-slate-400 leading-relaxed space-y-4 font-medium">
                            <p>
                                This Equinox Group Holdings, Inc. - IT Exit interview Policy outlines the mandatory procedures for the cessation of employment for all personnel within the organization. 
                                The primary goal is to ensure a secure, respectful, and legally compliant transition for both the departing employee and the company.
                            </p>
                            <p>
                                Failure to adhere to these guidelines may result in significant security vulnerabilities, legal liabilities, and data loss. 
                                **All IT assets must be returned within 48 hours of the termination date.**
                            </p>
                        </div>
                    </section>

                    <section id="data" className="scroll-mt-32 space-y-6">
                        <h2 className="text-3xl font-black text-white tracking-tight">Data & Privacy Protection</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { title: 'OneDrive Archiving', desc: 'All personal data must be moved to an administrative vault. Sync is disabled immediately upon notice.' },
                                { title: 'Email Litigation Hold', desc: 'Mailboxes for high-risk users are placed on infinite legal hold to prevent deletion of evidence.' },
                                { title: 'Teams History', desc: 'Chat history remains accessible for 30 days post-termination for business continuity audit.' }
                            ].map((item, i) => (
                                <div key={i} className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/60 hover:border-indigo-500/30 transition-all">
                                    <h4 className="text-indigo-400 font-black text-sm uppercase tracking-widest mb-2">{item.title}</h4>
                                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="assets" className="scroll-mt-32 space-y-6">
                        <h2 className="text-3xl font-black text-white tracking-tight">Asset Recovery Protocol</h2>
                        <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800/60 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-slate-800/20 group-hover:text-slate-800/40 transition-colors">
                                <HardDrive size={120} />
                            </div>
                            <ul className="space-y-4 relative z-10">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span className="text-slate-300 font-medium">Laptops, tablets, and mobile devices must be returned in person or via secure courier.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span className="text-slate-300 font-medium">All hardware tokens, security keys, and access cards are cancelled at 17:00 on the final day.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span className="text-slate-300 font-medium">Peripheral equipment (monitors, keyboards) remains company property unless otherwise specified in the separation agreement.</span>
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section id="access" className="scroll-mt-32 space-y-6">
                        <h2 className="text-3xl font-black text-white tracking-tight">Access Revocation Matrix</h2>
                        <div className="overflow-hidden rounded-2xl border border-slate-800/60 shadow-2xl">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/80 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-800/60">
                                    <tr>
                                        <th className="px-6 py-4">System Layer</th>
                                        <th className="px-6 py-4">Timing</th>
                                        <th className="px-6 py-4">Method</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/40 bg-slate-950/40 text-slate-400">
                                    {[
                                        { layer: 'Azure AD / M365', timing: 'Immediate', method: 'Account Disable + Token Revoke' },
                                        { layer: 'VPN / Network', timing: 'T+1 Hour', method: 'Certificate Revocation' },
                                        { layer: 'SaaS Platforms', timing: 'T+4 Hours', method: 'Manual License Reclamation' }
                                    ].map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-200">{row.layer}</td>
                                            <td className="px-6 py-4">{row.timing}</td>
                                            <td className="px-6 py-4 text-xs font-mono">{row.method}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section id="legal" className="scroll-mt-32 space-y-6">
                        <h2 className="text-3xl font-black text-white tracking-tight">Legal & Compliance</h2>
                        <div className="p-8 bg-rose-500/5 rounded-3xl border border-rose-500/10 space-y-4 border-dashed">
                            <div className="flex items-center gap-3 text-rose-500">
                                <Scale size={24} />
                                <h4 className="font-black uppercase tracking-widest text-sm">Warning: Non-Disclosure Agreement</h4>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                Departing employees are reminded that the Non-Disclosure Agreement (NDA) signed at the commencement of employment remains in full force. 
                                Unauthorized distribution of company trade secrets, customer lists, or proprietary source code will be prosecuted to the full extent of the law.
                            </p>
                            <div className="pt-4 flex items-center gap-3">
                                <Link 
                                    href="/offboarding"
                                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Confirm Acknowledgment
                                </Link>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
