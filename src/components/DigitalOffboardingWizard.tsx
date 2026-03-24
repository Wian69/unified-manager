"use client";

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, UploadCloud, X, ChevronRight, ChevronLeft, RefreshCw, Smartphone, ListChecks, ShieldCheck } from 'lucide-react';
import SignaturePad from './SignaturePad';

interface DigitalOffboardingWizardProps {
    user: any;
    onClose: () => void;
    onComplete: () => void;
}

export default function DigitalOffboardingWizard({ user, onClose, onComplete }: DigitalOffboardingWizardProps) {
    const [step, setStep] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [policySignature, setPolicySignature] = useState("");
    const [adminSignature, setAdminSignature] = useState("");
    
    // Sync with DEFAULT_SECTIONS from checklist/page.tsx
    const [checklist, setChecklist] = useState([
        { id: 1, label: "Uninstall Euphoria app & Office products from all devices", checked: false },
        { id: 2, label: "Return company-issued phone", checked: false },
        { id: 3, label: "Return company-issued laptop & power supply", checked: false },
        { id: 4, label: "Return peripherals (mouse, keyboard, headset, bag)", checked: false },
        { id: 5, label: "Remove company files/emails from personal devices", checked: false },
        { id: 6, label: "Verify no data remains on external storage", checked: false },
        { id: 7, label: "Confirm email forwarding setup", checked: false },
        { id: 8, label: "Clear MFA settings & remove from AD groups", checked: false },
    ]);

    const handleCheck = (id: number) => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    };

    const handleSubmit = async () => {
        if (!policySignature || !adminSignature) {
            alert("Signatures are required");
            return;
        }

        setUploading(true);
        setStatus("Loading modules...");

        try {
            const jsPDF = (await import('jspdf')).default;
            setStatus("Generating documents...");

            // --- PDF 1: POLICY ---
            const policyPdf = new jsPDF('p', 'mm', 'a4');
            policyPdf.setFont("helvetica", "bold");
            policyPdf.setFontSize(22);
            policyPdf.text("IT Offboarding Policy", 105, 30, { align: "center" });
            policyPdf.setLineWidth(0.5);
            policyPdf.line(20, 35, 190, 35);

            policyPdf.setFontSize(10);
            policyPdf.setFont("helvetica", "normal");
            policyPdf.text(`Subject Personnel: ${user.displayName}`, 20, 45);
            policyPdf.text(`Job Title: ${user.jobTitle || "N/A"}`, 20, 52);
            policyPdf.text(`Last Working Day: ${user.lastWorkingDay || "Today"}`, 20, 59);

            policyPdf.setFont("helvetica", "bold");
            policyPdf.text("Purpose", 20, 70);
            policyPdf.setFont("helvetica", "normal");
            policyPdf.text("To ensure a smooth transition, safeguard company assets, and maintain data security.", 20, 75, { maxWidth: 170 });

            policyPdf.setFont("helvetica", "bold");
            policyPdf.text("Procedure Snapshot", 20, 85);
            policyPdf.setFont("helvetica", "normal");
            const procs = [
                "- Uninstallation of Euphoria App and Office products (Outlook, Teams, OneDrive).",
                "- Return of all company property (Phone, Laptop, Peripherals).",
                "- Data removal from personal devices and external storage.",
                "- Setup of email forwarding for business continuity."
            ];
            procs.forEach((p, i) => policyPdf.text(p, 25, 92 + (i * 7), { maxWidth: 165 }));

            policyPdf.setFont("helvetica", "bold");
            policyPdf.text("Data Retention & Access", 20, 125);
            policyPdf.setFont("helvetica", "normal");
            const retentions = [
                "1. Email: Mailbox disabled on last day; retained for 12 months.",
                "2. OneDrive: Ownership transferred to manager; retained for 7 days.",
                "3. Teams: Channel files remain accessible; private chats follow OneDrive rules.",
                "4. Applications: Access fully removed from all SaaS platforms (MS365, Fusion etc)."
            ];
            retentions.forEach((r, i) => policyPdf.text(r, 20, 132 + (i * 7)));

            // Signatures
            policyPdf.line(20, 180, 190, 180);
            policyPdf.setFontSize(9);
            policyPdf.text("Equinox IT Support Signature", 20, 188);
            policyPdf.addImage(adminSignature, 'PNG', 20, 195, 50, 15);
            
            policyPdf.text(`${user.displayName} Signature`, 130, 188);
            policyPdf.addImage(policySignature, 'PNG', 130, 195, 50, 15);
            
            const policyBlob = policyPdf.output('blob');

            // --- PDF 2: CHECKLIST ---
            const checklistPdf = new jsPDF('p', 'mm', 'a4');
            checklistPdf.setFont("helvetica", "bold");
            checklistPdf.setFontSize(22);
            checklistPdf.text("IT Exit Interview Checklist", 105, 30, { align: "center" });
            checklistPdf.line(20, 35, 190, 35);

            checklistPdf.setFontSize(10);
            checklistPdf.setFont("helvetica", "normal");
            checklistPdf.text(`Employee: ${user.displayName}`, 20, 45);
            checklistPdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 52);

            checklistPdf.setFont("helvetica", "bold");
            checklistPdf.text("Verification Items:", 20, 65);
            checklistPdf.setFont("helvetica", "normal");
            checklist.forEach((item, i) => {
                const y = 75 + (i * 10);
                checklistPdf.rect(20, y - 4, 4, 4); 
                if (item.checked) {
                    checklistPdf.text("X", 21.5, y - 1);
                }
                checklistPdf.text(item.label, 28, y);
            });

            // Signatures
            checklistPdf.line(20, 180, 190, 180);
            checklistPdf.setFontSize(9);
            checklistPdf.text("Equinox IT Support Signature", 20, 188);
            checklistPdf.addImage(adminSignature, 'PNG', 20, 195, 50, 15);
            
            checklistPdf.text(`${user.displayName} Signature`, 130, 188);
            checklistPdf.addImage(policySignature, 'PNG', 130, 195, 50, 15);

            const checklistBlob = checklistPdf.output('blob');

            // --- UPLOAD ---
            if (!policyBlob || !checklistBlob) throw new Error("Failed to generate PDFs");

            setStatus("Uploading to SharePoint...");
            const formData = new FormData();
            formData.append('action', 'upload');
            formData.append('userName', user.displayName);
            formData.append('policyFile', policyBlob, "EQN IT Exit Policy Digital.pdf");
            formData.append('checklistFile', checklistBlob, "EQN IT Exit Checklist Digital.pdf");

            const res = await fetch('/api/offboarding/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                setStatus("✅ Offboarding Complete!");
                setTimeout(() => {
                    onComplete();
                    onClose();
                }, 2000);
            } else {
                setStatus("❌ " + (data.details || data.error));
            }
        } catch (err: any) {
            setStatus("❌ Error: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const next = () => setStep(s => s + 1);
    const prev = () => setStep(s => s - 1);

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <Smartphone className="text-blue-500" size={24} />
                    <div>
                        <h2 className="text-xl font-black text-white leading-tight uppercase tracking-tighter">Digital Offboarding</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.displayName}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all"><X size={24} /></button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
                <div className="max-w-2xl mx-auto space-y-12">
                    
                    {/* STEP 1: POLICY REVIEW */}
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
                            <div className="bg-blue-600/10 p-6 rounded-2xl border border-blue-500/20">
                                <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                                    <ShieldCheck size={20} /> Official IT Policy
                                </h3>
                                <p className="text-xs text-blue-300/60 leading-relaxed italic">Review the core offboarding requirements with the employee.</p>
                            </div>
                            
                            <div className="bg-white p-8 rounded-2xl shadow-xl text-slate-900 text-sm space-y-6">
                                <h4 className="text-center font-bold text-lg border-b border-slate-200 pb-4 mb-6">Equinox IT Offboarding Policy</h4>
                                <div className="space-y-4 text-[13px] leading-relaxed">
                                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                                        <p><strong>Subject:</strong> {user.displayName}</p>
                                        <p><strong>Last Working Day:</strong> {user.lastWorkingDay || "Today"}</p>
                                    </div>
                                    
                                    <section>
                                        <p className="font-bold text-blue-800 mb-1 uppercase text-[10px] tracking-widest">Purpose</p>
                                        <p>To ensure a smooth transition, safeguard company assets, and maintain data security.</p>
                                    </section>

                                    <section>
                                        <p className="font-bold text-blue-800 mb-2 uppercase text-[10px] tracking-widest">Core Procedures</p>
                                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                                            <li><span className="font-bold">Software:</span> Uninstall Euphoria App, Outlook, Teams & OneDrive from all devices.</li>
                                            <li><span className="font-bold">Hardware:</span> Return of phone, laptop, and any provided equipment.</li>
                                            <li><span className="font-bold">Data:</span> Removal of company files from personal devices.</li>
                                            <li><span className="font-bold">Email:</span> Setup of mandatory email forwarding.</li>
                                        </ul>
                                    </section>

                                    <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-2">Access Retention</p>
                                        <div className="grid grid-cols-2 gap-4 text-[11px]">
                                            <div>
                                                <p className="font-bold">Email</p>
                                                <p className="text-slate-500 italic">Disabled on last day; 12 month retention.</p>
                                            </div>
                                            <div>
                                                <p className="font-bold">OneDrive</p>
                                                <p className="text-slate-500 italic">Manager access for 7 days.</p>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CHECKLIST */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
                            <div className="bg-emerald-600/10 p-6 rounded-2xl border border-emerald-500/20">
                                <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                    <ListChecks size={20} /> Verification Checklist
                                </h3>
                                <p className="text-xs text-emerald-300/60 leading-relaxed italic">Tap each item to confirm completion.</p>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                                <div className="p-6 bg-slate-950/50 rounded-t-2xl border-b border-slate-800">
                                     <h4 className="text-[10px] font-black text-white uppercase tracking-widest text-center">Equipment & Security Verification</h4>
                                </div>
                                {checklist.map(item => (
                                    <div 
                                        key={item.id} 
                                        className={`p-5 flex items-center gap-4 cursor-pointer transition-all ${item.checked ? 'bg-emerald-500/5' : 'hover:bg-slate-800/50'}`}
                                        onClick={() => handleCheck(item.id)}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'}`}>
                                            {item.checked && <CheckCircle2 size={16} className="text-white" />}
                                        </div>
                                        <span className={`text-sm ${item.checked ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SIGNATURES */}
                    {step === 3 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
                             <div className="bg-purple-600/10 p-6 rounded-2xl border border-purple-500/20">
                                <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                                    <UploadCloud size={20} /> Final Acknowledgment
                                </h3>
                                <p className="text-xs text-purple-300/60 leading-relaxed italic">Capture signatures for the official archival records.</p>
                            </div>

                            <div className="space-y-12">
                                <SignaturePad 
                                    label={`Employee Signature (${user.displayName})`} 
                                    onSave={(val) => setPolicySignature(val)} 
                                />
                                <SignaturePad 
                                    label="IT Admin Signature (Equinox Support)" 
                                    onSave={(val) => setAdminSignature(val)} 
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUBMITTING */}
                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500 min-h-[400px] text-left">
                            {uploading ? (
                                <div className="flex flex-col items-center gap-6">
                                    <RefreshCw className="animate-spin text-blue-500" size={64} />
                                    <div className="text-center">
                                        <p className="text-xl font-black text-white uppercase tracking-tighter mb-2">{status}</p>
                                        <p className="text-xs text-slate-500 font-mono italic">Syncing with SharePoint & Watchlist...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-6">
                                    <div className={`text-2xl font-black uppercase tracking-tighter ${status?.includes('✅') ? 'text-emerald-400' : 'text-white'}`}>
                                        {status || "Ready to Finalize"}
                                    </div>
                                    {!status?.includes('✅') && (
                                        <button 
                                            onClick={handleSubmit}
                                            className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl shadow-blue-600/20 active:scale-95 transition-all text-center flex items-center justify-center gap-3"
                                        >
                                            <UploadCloud size={24} /> Finalize Offboarding
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Footer Navigation */}
            <div className="bg-slate-900 border-t border-slate-800 p-6 flex justify-between gap-4 fixed bottom-0 left-0 right-0 z-20">
                {step > 1 && step < 4 && (
                    <button 
                        onClick={prev}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold uppercase tracking-widest text-[12px] hover:bg-slate-700 transition-all border border-slate-700"
                    >
                        <ChevronLeft size={20} /> Back
                    </button>
                )}
                {step < 4 && (
                    <button 
                        onClick={step === 3 ? next : next}
                        disabled={step === 2 && checklist.some(i => !i.checked)}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[12px] transition-all ${
                            step === 2 && checklist.some(i => !i.checked)
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                            : 'bg-white text-slate-900 hover:bg-slate-200 shadow-xl'
                        }`}
                    >
                        {step === 3 ? "Review & Finalize" : "Next Step"} <ChevronRight size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
