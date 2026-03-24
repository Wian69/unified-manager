"use client";

import React, { useState, useRef } from 'react';
import { ShieldAlert, CheckCircle2, FileText, UploadCloud, X, ChevronRight, ChevronLeft, RefreshCw, Smartphone } from 'lucide-react';
import SignaturePad from './SignaturePad';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
    const [checklist, setChecklist] = useState([
        { id: 1, label: "Euphoria & Office uninstalled", checked: false },
        { id: 2, label: "Company phone returned", checked: false },
        { id: 3, label: "Company laptop returned", checked: false },
        { id: 4, label: "Peripherals returned", checked: false },
        { id: 5, label: "Data removed from personal devices", checked: false },
        { id: 6, label: "Email forwarding setup", checked: false },
    ]);

    const policyRef = useRef<HTMLDivElement>(null);
    const checklistRef = useRef<HTMLDivElement>(null);

    const handleCheck = (id: number) => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    };

    const generatePDF = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
        if (!ref.current) return null;
        const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        return pdf.output('blob');
    };

    const handleSubmit = async () => {
        if (!policySignature || !adminSignature) {
            alert("Signatures are required");
            return;
        }

        setUploading(true);
        setStatus("Generating documents...");

        try {
            const policyBlob = await generatePDF(policyRef, "Policy.pdf");
            const checklistBlob = await generatePDF(checklistRef, "Checklist.pdf");

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
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-blue-600/10 p-6 rounded-2xl border border-blue-500/20">
                                <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                                    <ShieldAlert size={20} /> Review IT Policy
                                </h3>
                                <p className="text-xs text-blue-300/60 leading-relaxed italic">Please go through the following policy with the employee.</p>
                            </div>
                            
                            <div ref={policyRef} className="bg-white p-8 rounded-2xl shadow-xl text-slate-900 text-sm space-y-6">
                                <h4 className="text-center font-bold text-lg border-b border-slate-200 pb-4 mb-6">IT Offboarding Policy</h4>
                                <div className="space-y-4">
                                    <p><strong>Subject Personnel:</strong> {user.displayName}</p>
                                    <p><strong>Last Working Day:</strong> {user.lastWorkingDay || "Today"}</p>
                                    <div className="border-t border-slate-100 pt-4 space-y-3">
                                        <p className="font-bold">1. Purpose</p>
                                        <p className="text-[12px]">To ensure a smooth transition, safeguard company assets, and maintain data security.</p>
                                        <p className="font-bold">2. Procedure</p>
                                        <ul className="list-disc pl-5 text-[12px] space-y-2">
                                            <li>Uninstallation of Euphoria/Office from all devices.</li>
                                            <li>Return of company hardware (Phone, Laptop).</li>
                                            <li>Data removal from personal devices.</li>
                                            <li>Email forwarding setup.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CHECKLIST */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-emerald-600/10 p-6 rounded-2xl border border-emerald-500/20">
                                <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                    <CheckCircle2 size={20} /> Completion Checklist
                                </h3>
                                <p className="text-xs text-emerald-300/60 leading-relaxed italic">Verify each item before proceeding to signatures.</p>
                            </div>

                            <div ref={checklistRef} className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                                <div className="p-6 bg-slate-950/50 rounded-t-2xl">
                                     <h4 className="text-sm font-bold text-white uppercase tracking-widest text-center">Offboarding Verification</h4>
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
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                             <div className="bg-purple-600/10 p-6 rounded-2xl border border-purple-500/20">
                                <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                                    <UploadCloud size={20} /> Digital Signatures
                                </h3>
                                <p className="text-xs text-purple-300/60 leading-relaxed italic">Capture signatures directly on the screen.</p>
                            </div>

                            <div className="space-y-12">
                                <SignaturePad 
                                    label="Employee Signature" 
                                    onSave={(val) => setPolicySignature(val)} 
                                />
                                <SignaturePad 
                                    label="IT Admin Signature" 
                                    onSave={(val) => setAdminSignature(val)} 
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUBMITTING */}
                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500 min-h-[400px]">
                            {uploading ? (
                                <div className="flex flex-col items-center gap-6">
                                    <RefreshCw className="animate-spin text-blue-500" size={64} />
                                    <div className="text-center">
                                        <p className="text-xl font-black text-white uppercase tracking-tighter mb-2">{status}</p>
                                        <p className="text-xs text-slate-500 font-mono italic">Please do not close this window</p>
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
                                            className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl shadow-blue-600/20 active:scale-95 transition-all"
                                        >
                                            Finalize & Upload
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
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold uppercase tracking-widest text-[12px] hover:bg-slate-700 transition-all"
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
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-white text-slate-900 hover:bg-slate-200 shadow-xl'
                        }`}
                    >
                        {step === 3 ? "Review Submission" : "Next Step"} <ChevronRight size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
