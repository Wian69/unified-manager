"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ShieldCheck, Lock, HardDrive, UserCheck, Scale, Mail, MessageSquare, Database, Smartphone, Laptop, Trash2, Printer, Download } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

export default function PolicyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs tracking-widest uppercase text-white animate-pulse">Loading Governance Context...</div>}>
            <PolicyContent />
        </Suspense>
    );
}

function PolicyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get('user');
    const [userName, setUserName] = useState("Employee");
    const [lastDay, setLastDay] = useState(new Date().toLocaleDateString());

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

    return (
        <div className="min-h-screen bg-[#0b0f19] text-slate-200 selection:bg-blue-500/30 pb-32 print:bg-white print:text-black">
            {/* Top Navigation Bar - Hidden on Print */}
            <nav className="sticky top-0 z-50 bg-[#0b0f19]/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex justify-between items-center shadow-2xl print:hidden">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.back()}
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/10"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">IT Exit interview Policy</h1>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-1">Status: Compliance Verified</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Printer size={14} />
                        Print for Records
                    </button>
                </div>
            </nav>

            {/* Document Container - PRINT CENTERED */}
            <div className="w-full px-12 mt-16 print:mt-0 print:px-8 max-w-none print:max-w-[800px] print:mx-auto">
                
                {/* PROFESSIONAL POLICY HEADER with LOGO */}
                <div className="border-b-2 border-slate-800 pb-12 mb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-12 print:border-black print:mb-8">
                    <div className="flex items-center gap-6">
                        {/* Final Company Logo */}
                        <div className="flex flex-col">
                            <img src="/equinox-logo.png" alt="Equinox Outsourced Services" className="h-20 w-auto" />
                            <p className="text-[10px] font-black tracking-[0.5em] text-slate-500 mt-4 ml-1 print:text-black">INC. CORPORATE GOVERNANCE</p>
                        </div>
                    </div>

                    <div className="text-right space-y-2 group">
                        <div className="inline-block px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full print:border-black">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest print:text-black">Confidential Document</p>
                        </div>
                        <p className="text-sm font-bold text-white print:text-black">Ref ID: OFF-{userId?.substring(0,8).toUpperCase() || "GEN-01"}</p>
                        <p className="text-[10px] text-slate-500 print:text-black font-mono">Issued by: Group IT Legal & Compliance</p>
                    </div>
                </div>

                {/* Policy Metadata Detail View */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-20 bg-white/[0.02] p-10 rounded-3xl border border-white/5 print:border-black print:bg-white print:p-4 print:mb-10">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Document Name</p>
                        <p className="text-white font-black text-xl print:text-black leading-tight">IT Exit interview Policy</p>
                    </div>
                    <div className="space-y-1 border-l border-white/10 pl-8 print:border-black">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Effective Date</p>
                        <p className="text-emerald-400 font-black text-xl print:text-black">{lastDay}</p>
                    </div>
                    <div className="space-y-1 border-l border-white/10 pl-8 print:border-black">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Subject Personnel</p>
                        <p className="text-white font-black text-xl print:text-black">{userName}</p>
                    </div>
                    <div className="space-y-1 border-l border-white/10 pl-8 print:border-black">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Classification</p>
                        <p className="text-rose-500 font-black text-xl print:text-black uppercase">Restricted</p>
                    </div>
                </div>

                {/* Primary Narrative Content - Expanded Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-20">
                    <div className="space-y-16">
                        {/* Section 1: Core Definitions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <section className="space-y-4">
                                <h4 className="flex items-center gap-3 text-lg font-black text-white uppercase tracking-widest print:text-black">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    Purpose
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium print:text-black">
                                    The purpose of this policy is to ensure a smooth transition for employees leaving the company, safeguard company assets, and maintain data security.
                                </p>
                            </section>
                            <section className="space-y-4">
                                <h4 className="flex items-center gap-3 text-lg font-black text-white uppercase tracking-widest print:text-black">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    Scope
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium print:text-black">
                                    This policy applies to all employees who are exiting Equinox Group Holdings, Inc.
                                </p>
                            </section>
                        </div>

                        {/* Section 2: Procedure Grid */}
                        <section className="space-y-12">
                            <h4 className="text-2xl font-black text-white uppercase tracking-tighter border-b border-white/10 pb-6 print:text-black">Departure Protocol <span className="text-blue-500">(Mandatory)</span></h4>
                            
                            <div className="space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-[60px_1fr] gap-6 group">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-all print:border-black print:text-black print:bg-white print:border">1</div>
                                    <div className="space-y-3">
                                        <h5 className="text-white font-black text-lg uppercase tracking-tight print:text-black">Uninstallation of Euphoria App and Office products</h5>
                                        <p className="text-slate-400 text-sm leading-relaxed font-medium print:text-black">
                                            The Equinox Group Holdings Inc. IT support will ensure that the <span className="text-white print:text-black font-bold">Euphoria app, Outlook, Teams & OneDrive</span> is uninstalled from all company and personal devices used by the departing employee.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-[60px_1fr] gap-6 group">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-amber-500 font-black text-xl group-hover:bg-amber-500 group-hover:text-white transition-all print:border-black print:text-black print:bg-white print:border">2</div>
                                    <div className="space-y-4">
                                        <h5 className="text-white font-black text-lg uppercase tracking-tight print:text-black">Return of Company Property</h5>
                                        <p className="text-slate-400 text-sm leading-relaxed font-medium print:text-black">
                                            The departing employee must return all company property, including but not limited to:
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { icon: <Smartphone size={16}/>, text: 'Company-issued phone' },
                                                { icon: <Laptop size={16}/>, text: 'Company-issued laptop' },
                                                { icon: <HardDrive size={16}/>, text: 'Other equipment or materials' }
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 text-slate-300 print:text-black print:border-black">
                                                    {item.icon}
                                                    <span className="text-xs font-bold uppercase tracking-widest">{item.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-[60px_1fr] gap-6 group">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-rose-500 font-black text-xl group-hover:bg-rose-500 group-hover:text-white transition-all print:border-black print:text-black print:bg-white print:border">3</div>
                                    <div className="space-y-3">
                                        <h5 className="text-white font-black text-lg uppercase tracking-tight print:text-black">Data Removal Protocol</h5>
                                        <p className="text-slate-400 text-sm leading-relaxed font-medium print:text-black">
                                            The Equinox Group Holdings Inc. IT support will take all necessary steps to remove company data from non-company property. This includes ensuring all files, emails, and applications are deleted and verifying no data remains on external storage devices.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Additional Procedures */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <section className="space-y-4">
                                <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest">4. Email Forwarding</h4>
                                <p className="text-slate-400 text-sm leading-relaxed print:text-black font-medium text-justify">
                                    The Equinox Group Holdings Inc. IT support will set up necessary email forwarding to ensure that any important communications are redirected to the appropriate personnel.
                                </p>
                            </section>
                            <section className="space-y-4">
                                <h4 className="text-emerald-400 font-black text-xs uppercase tracking-widest">5. Final Checklist</h4>
                                <p className="text-slate-400 text-sm leading-relaxed print:text-black font-medium text-justify">
                                    The Equinox Group Holdings Inc. IT support will provide the departing employee with a final checklist to ensure all steps are completed. This checklist will include:
                                </p>
                            </section>
                        </div>
                    </div>

                    {/* Side Panel: Digital Retention Policy (Full Detail) */}
                    <div className="space-y-12 print:page-break-before">
                        <div className="bg-white/[0.03] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden print:border-black print:bg-white print:p-0 print:border-none print:shadow-none">
                            <div className="absolute top-0 right-0 p-8 text-blue-500/10 pointer-events-none print:hidden">
                                <Database size={160} />
                            </div>
                            
                            <h4 className="text-xl font-black text-white uppercase tracking-tight mb-8 print:text-black">Digital Information Summary</h4>
                            
                            <div className="space-y-10">
                                {[
                                    { title: 'Email Mailbox', desc: 'Disabled immediately. Retained for 12 months. Manager receives full access.' },
                                    { title: 'OneDrive Data', desc: 'Ownership transferred to manager for 7 days. Permanent deletion thereafter.' },
                                    { title: 'Teams History', desc: 'Private chats follow legal retention rules. Channel files remain with the Team.' },
                                    { title: 'Shared Systems', desc: 'Permissions revoked. All created content remains Equinox IP.' }
                                ].map((sys, idx) => (
                                    <div key={idx} className="space-y-2 relative z-10">
                                        <p className="text-xs font-black text-blue-500 uppercase tracking-widest print:text-black">{sys.title}</p>
                                        <p className="text-slate-400 text-sm leading-relaxed font-medium print:text-black">{sys.desc}</p>
                                        <div className="h-px bg-white/5 w-1/3 mt-2 print:bg-black" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="space-y-10 pt-12 border-t border-white/10 print:border-black print:border-t-2">
                            <div className="space-y-6">
                                <div className="h-0.5 bg-slate-700 w-full mb-2 print:bg-black" />
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 print:text-black">
                                    <span>Employee Signature</span>
                                    <span>Date</span>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="h-0.5 bg-slate-700 w-full mb-2 print:bg-black" />
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 print:text-black">
                                    <span>Equinox Group Holdings Inc. IT support</span>
                                    <span>Date</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Print Footer */}
                <div className="hidden print:block fixed bottom-0 left-0 right-0 text-center py-8 text-[8px] font-black uppercase tracking-[0.5em] text-slate-400">
                    &copy; {new Date().getFullYear()} Equinox Group Holdings, Inc. - Strictly Confidential
                </div>
            </div>
        </div>
    );
}
