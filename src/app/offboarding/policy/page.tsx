"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ShieldCheck, Lock, HardDrive, UserCheck, Scale, Mail, MessageSquare, Database, Smartphone, Laptop, Trash2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

export default function PolicyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs tracking-widest uppercase text-white animate-pulse">Loading Policy Engine...</div>}>
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
        <div className="min-h-screen bg-[#0b0f19] text-slate-200 selection:bg-blue-500/30 pb-32">
            {/* Top Navigation Bar */}
            <nav className="sticky top-0 z-50 bg-[#0b0f19]/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex justify-between items-center shadow-2xl">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.back()}
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/10"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">IT Exit interview Policy</h1>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-1">Equinox Group Holdings, Inc.</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-white"
                    >
                        Print as PDF
                    </button>
                </div>
            </nav>

            {/* Document Content */}
            <div className="max-w-4xl mx-auto px-8 mt-16 space-y-16">
                
                {/* Header Section */}
                <div className="space-y-4 border-l-4 border-blue-600 pl-8 py-2">
                    <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">Official Governance</h2>
                    <h3 className="text-4xl font-black text-white tracking-tight leading-tight">Equinox Group Holdings, Inc. <br/> <span className="text-slate-500 text-3xl">- IT Exit interview Policy</span></h3>
                    <p className="text-slate-400 font-medium text-sm">
                        <span className="text-blue-400 font-bold">Effective Date:</span> This policy is effective as of {lastDay}
                    </p>
                </div>

                {/* Purpose & Scope */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">Purpose</h4>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            The purpose of this policy is to ensure a smooth transition for employees leaving the company, safeguard company assets, and maintain data security.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">Scope</h4>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            This policy applies to all employees who are exiting Equinox Group Holdings, Inc.
                        </p>
                    </div>
                </div>

                {/* Procedure List */}
                <div className="space-y-10 bg-white/[0.02] p-10 rounded-[2rem] border border-white/5">
                    <h4 className="text-xl font-black text-white flex items-center gap-3">
                         <span className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center text-sm">1</span>
                         Procedure Tasks
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-8 ml-4">
                        <div className="space-y-2">
                            <h5 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">1. Uninstallation of Software</h5>
                            <p className="text-slate-300 text-sm font-medium leading-relaxed">
                                The **Group IT Support Specialist** will ensure that the Euphoria app, Outlook, Teams & Onedrive is uninstalled from all company and personal devices used by the departing employee.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h5 className="text-amber-400 font-black text-[10px] uppercase tracking-widest">2. Return of Company Property</h5>
                            <p className="text-slate-300 text-sm font-medium leading-relaxed">
                                The departing employee must return all company property, including but not limited to:
                            </p>
                            <ul className="text-slate-400 text-xs font-bold space-y-1 ml-4 list-disc marker:text-amber-500">
                                <li>Company-issued phone</li>
                                <li>Laptop</li>
                                <li>Any other equipment or materials provided by the company</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h5 className="text-rose-400 font-black text-[10px] uppercase tracking-widest">3. Data Removal</h5>
                            <p className="text-slate-300 text-sm font-medium leading-relaxed">
                                The **Group IT Support Specialist** will take all necessary steps to remove company data from non-company property. This includes:
                            </p>
                            <ul className="text-slate-400 text-xs font-bold space-y-1 ml-4 list-disc marker:text-rose-500">
                                <li>Ensuring that all company-related files, emails, and applications are deleted from personal devices.</li>
                                <li>Verifying that no company data remains on any external storage devices used by the employee.</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h5 className="text-blue-400 font-black text-[10px] uppercase tracking-widest">4. Email Forwarding</h5>
                            <p className="text-slate-300 text-sm font-medium leading-relaxed">
                                The **Group IT Support Specialist** will set up necessary email forwarding to ensure that any important communications are redirected to the appropriate personnel.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h5 className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">5. Final Checklist</h5>
                            <p className="text-slate-300 text-sm font-medium leading-relaxed">
                                The **Group IT Support Specialist** will provide the departing employee with a final checklist to ensure all steps are completed. This checklist will include:
                            </p>
                            <ul className="text-slate-400 text-xs font-bold space-y-1 ml-4 list-disc marker:text-emerald-500">
                                <li>Confirmation of Euphoria app and other applications uninstallation</li>
                                <li>Return of all company property</li>
                                <li>Verification of data removal from personal devices</li>
                                <li>Confirmation of email forwarding setup</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Responsibilities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-slate-900/50 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 text-white">
                             <User size={18} className="text-blue-500" />
                             <h4 className="font-black text-sm uppercase tracking-widest text-white">Departing Employee</h4>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium">Ensure the return of all company property and compliance with data removal procedures.</p>
                    </div>
                    <div className="p-8 bg-slate-900/50 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 text-white">
                             <ShieldCheck size={18} className="text-blue-500" />
                             <h4 className="font-black text-sm uppercase tracking-widest text-white">Group IT Support Specialist</h4>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium">Oversee the uninstallation of the Euphoria app, data removal, and email forwarding setup.</p>
                    </div>
                </div>

                {/* Digital Information Summary */}
                <div className="space-y-12 pt-16 border-t border-white/5">
                    <div className="space-y-4">
                        <h4 className="text-2xl font-black text-white tracking-tight">Post-Departure Digital Process</h4>
                        <p className="text-slate-500 text-sm font-medium">The summary below outlines the process followed by the IT department for your digital information.</p>
                    </div>

                    <div className="space-y-8 divide-y divide-white/5">
                        {/* Email */}
                        <div className="pt-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 group">
                            <div className="flex items-center gap-3 text-blue-400">
                                <Mail size={24} />
                                <h5 className="font-black text-xs uppercase tracking-widest">1. Email Inbox</h5>
                            </div>
                            <div className="space-y-3">
                                <p className="text-white text-sm font-black">Outlook / Microsoft 365 Mailbox</p>
                                <ul className="text-slate-400 text-xs font-medium space-y-2 list-disc ml-4 marker:text-blue-600">
                                    <li>Mailbox disabled on your last working day.</li>
                                    <li>Manager or designated successor receives full access for business continuity.</li>
                                    <li>Auto reply and forwarding (if applicable) configured per policy.</li>
                                    <li>Mailbox retained for 12 months per retention policies.</li>
                                </ul>
                                <p className="text-[10px] text-blue-500/80 font-black uppercase">Result: Access fully revoked upon completion.</p>
                            </div>
                        </div>

                        {/* OneDrive */}
                        <div className="pt-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 group">
                            <div className="flex items-center gap-3 text-indigo-400">
                                <HardDrive size={24} />
                                <h5 className="font-black text-xs uppercase tracking-widest">2. OneDrive</h5>
                            </div>
                            <div className="space-y-3">
                                <p className="text-white text-sm font-black">Cloud Files & Data</p>
                                <ul className="text-slate-400 text-xs font-medium space-y-2 list-disc ml-4 marker:text-indigo-600">
                                    <li>Ownership transferred to your manager.</li>
                                    <li>7-day review period for business-related file relocation.</li>
                                    <li>OneDrive contents deleted following retention period.</li>
                                </ul>
                                <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tight">Note: Personal files export requires formal IT approval.</p>
                                </div>
                            </div>
                        </div>

                        {/* Teams */}
                        <div className="pt-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 group">
                            <div className="flex items-center gap-3 text-emerald-400">
                                <MessageSquare size={24} />
                                <h5 className="font-black text-xs uppercase tracking-widest">3. Teams</h5>
                            </div>
                            <div className="space-y-3">
                                <p className="text-white text-sm font-black">Chats & Shared Files</p>
                                <ul className="text-slate-400 text-xs font-medium space-y-2 list-disc ml-4 marker:text-emerald-600">
                                    <li>Private chats stored per compliance and retention rules.</li>
                                    <li>No direct access to private history unless legally required.</li>
                                    <li>Files in Teams channels remain accessible to the department.</li>
                                </ul>
                            </div>
                        </div>

                        {/* SharePoint */}
                        <div className="pt-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 group">
                            <div className="flex items-center gap-3 text-slate-400">
                                <Database size={24} />
                                <h5 className="font-black text-xs uppercase tracking-widest">4. SharePoint</h5>
                            </div>
                            <div className="space-y-3">
                                <p className="text-white text-sm font-black">Corporate Environment</p>
                                <ul className="text-slate-400 text-xs font-medium space-y-2 list-disc ml-4">
                                    <li>All documents remain part of their respective sites.</li>
                                    <li>Access permissions removed from all folders, groups, and sites.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Applications */}
                        <div className="pt-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 group">
                            <div className="flex items-center gap-3 text-amber-400">
                                <Smartphone size={24} />
                                <h5 className="font-black text-xs uppercase tracking-widest">5. Applications</h5>
                            </div>
                            <div className="space-y-3">
                                <p className="text-white text-sm font-black">SaaS & Third-Party Platforms</p>
                                <ul className="text-slate-400 text-xs font-medium space-y-2 list-disc ml-4 marker:text-amber-600">
                                    <li>Full removal from systems (Jira, Freshservice, SAP, Slack).</li>
                                    <li>Active tasks reassigned to department management.</li>
                                    <li>All content remains IP of Equinox Group Holdings, Inc.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Personal Data */}
                        <div className="pt-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 group">
                            <div className="flex items-center gap-3 text-rose-400">
                                <Trash2 size={24} />
                                <h5 className="font-black text-xs uppercase tracking-widest">6. Personal Data</h5>
                            </div>
                            <div className="space-y-3">
                                <p className="text-white text-sm font-black">Personal Files Review</p>
                                <ul className="text-slate-400 text-xs font-medium space-y-2 list-disc ml-4 marker:text-rose-600">
                                    <li>Personal Data Review request available before last day.</li>
                                    <li>IT assist in identification and transfer of non-corporate items.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signature Section */}
                <div className="mt-24 pt-16 border-t font-mono">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-16">
                        <div className="w-full md:w-1/2 space-y-2">
                             <div className="h-px bg-slate-400 w-full mb-4" />
                             <p className="text-xs font-black uppercase tracking-widest text-slate-500">Employee Signature</p>
                        </div>
                        <div className="w-full md:w-1/3 space-y-2 text-right">
                             <div className="h-px bg-slate-400 w-full mb-4" />
                             <p className="text-xs font-black uppercase tracking-widest text-slate-500">Date: {lastDay}</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
