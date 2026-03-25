"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, UploadCloud, X, ChevronRight, ChevronLeft, RefreshCw, Smartphone, ListChecks, ShieldCheck, Mail, Laptop, Shield } from 'lucide-react';
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

    const [userDetails, setUserDetails] = useState({
        email: user.mail || user.userPrincipalName || "",
        device: "",
        jobTitle: user.jobTitle || "________________________",
        lastDay: user.lastWorkingDay || new Date().toLocaleDateString()
    });

    const [itAdmin, setItAdmin] = useState({
        sharedMailbox: "",
        emailForward: "",
        removeLicense: false,
        removeFromGroups: false,
        dataRemoval: "Yes",
        clearMFA: false,
        devicePin: ""
    });

    const [checklist, setChecklist] = useState([
        // Section 1: To be completed with the User
        { id: 1, section: 1, label: "Ensure the Euphoria app and Office products is uninstalled from all company and personal devices.", checked: false },
        { id: 2, section: 1, label: "Return company-issued phone.", checked: false },
        { id: 3, section: 1, label: "Return company-issued laptop.", checked: false },
        { id: 4, section: 1, label: "Return any other equipment or materials provided by the company.", checked: false },
        { id: 5, section: 1, label: "Remove all company-related files, emails, and applications from personal devices.", checked: false },
        { id: 6, section: 1, label: "Verify no company data remains on any external storage devices used by the employee.", checked: false },
        { id: 7, section: 1, label: "Confirm uninstallation of Euphoria app and Office products.", checked: false },
        { id: 8, section: 1, label: "Confirm return of all company property.", checked: false },
        { id: 9, section: 1, label: "Verify data removal from personal devices.", checked: false },
        { id: 10, section: 1, label: "Confirm email forwarding setup.", checked: false },
        
        // Section 2: Company Assets Returned
        { id: 101, section: 2, label: "Laptop / Desktop", checked: false },
        { id: 102, section: 2, label: "Power supply", checked: false },
        { id: 103, section: 2, label: "External peripherals (mouse, keyboard, headset, adapters)", checked: false },
        { id: 104, section: 2, label: "Mobile phone / SIM", checked: false },
        { id: 105, section: 2, label: "Access cards / security tokens", checked: false },
        { id: 106, section: 2, label: "Laptop Bag", checked: false },
    ]);

    useEffect(() => {
        // Fetch Device Details
        fetch(`/api/devices`)
            .then(r => r.json())
            .then(d => {
                if (d.devices?.length > 0) {
                    const userDevices = d.devices.filter((dev: any) => dev.userId === user.id);
                    const sorted = (userDevices.length > 0 ? userDevices : d.devices)
                        .sort((a: any, b: any) => new Date(b.lastSyncDateTime || 0).getTime() - new Date(a.lastSyncDateTime || 0).getTime());
                    setUserDetails(prev => ({ ...prev, device: sorted[0].deviceName || sorted[0].displayName || "" }));
                }
            })
            .catch(() => {});
    }, [user.id]);

    const handleCheck = (id: number) => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    };

    const addCustomItem = (section: number) => {
        const newId = Math.max(...checklist.map(i => i.id), 1000) + 1;
        setChecklist(prev => [...prev, { id: newId, section, label: "Custom Item...", checked: false }]);
    };

    const editItemLabel = (id: number, label: string) => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, label } : item));
    };

    const removeItem = (id: number) => {
        setChecklist(prev => prev.filter(item => item.id !== id));
    };

    const handleSubmit = async () => {
        if (!policySignature || !adminSignature) {
            alert("Signatures are required to finalize offboarding.");
            return;
        }

        setUploading(true);
        setStatus("Loading PDF engine...");

        try {
            const jsPDF = (await import('jspdf')).default;
            
            // Helper to get Logo as Base64
            const getLogoBase64 = async () => {
                try {
                    const response = await fetch('/Equinox-Logo-Transparent.png');
                    const blob = await response.blob();
                    return new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                } catch { return null; }
            };

            const logoBase64 = await getLogoBase64();
            setStatus("Generating Official Policy...");

            // --- PDF 1: POLICY (MATCHING manual policy/page.tsx) ---
            const policyPdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            const pageWidth = policyPdf.internal.pageSize.getWidth();
            const pageHeight = policyPdf.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            let y = 35;

            const checkPageBreak = (doc: any, currentY: number, needed: number) => {
                if (currentY + needed > pageHeight - 20) {
                    doc.addPage();
                    return 20; // Reset Y to top margin
                }
                return currentY;
            };
            
            // Header
            if (logoBase64) policyPdf.addImage(logoBase64, 'PNG', margin, 15, 40, 15, undefined, 'FAST');
            policyPdf.setFont("helvetica", "bold");
            policyPdf.setFontSize(18);
            policyPdf.text("IT Offboarding Policy", pageWidth - margin, 25, { align: "right" });
            policyPdf.setLineWidth(0.5);
            policyPdf.line(margin, 35, pageWidth - margin, 35);

            // Cover Details Box
            y = 45;
            policyPdf.rect(margin, y, contentWidth, 35);
            policyPdf.setFontSize(9);
            policyPdf.text("Policy Owner:", margin + 5, y + 7); policyPdf.setFont("helvetica", "normal"); policyPdf.text("Group IT Support Specialist", margin + 45, y + 7);
            policyPdf.line(margin + 5, y + 10, pageWidth - margin - 5, y + 10);
            policyPdf.setFont("helvetica", "bold"); policyPdf.text("Subject Personnel:", margin + 5, y + 16); policyPdf.setFont("helvetica", "normal"); policyPdf.text(user.displayName, margin + 45, y + 16);
            policyPdf.line(margin + 5, y + 19, pageWidth - margin - 5, y + 19);
            policyPdf.setFont("helvetica", "bold"); policyPdf.text("Job Title:", margin + 5, y + 25); policyPdf.setFont("helvetica", "normal"); policyPdf.text(userDetails.jobTitle, margin + 45, y + 25);
            policyPdf.line(margin + 5, y + 28, pageWidth - margin - 5, y + 28);
            policyPdf.setFont("helvetica", "bold"); policyPdf.text("Last Working Day:", margin + 5, y + 34); policyPdf.setFont("helvetica", "normal"); policyPdf.text(userDetails.lastDay, margin + 45, y + 34);
            y += 45;

            y = checkPageBreak(policyPdf, y, 20);
            policyPdf.setFont("helvetica", "bold"); policyPdf.setFontSize(11); policyPdf.text("Purpose", margin, y); y += 6;
            policyPdf.setFont("helvetica", "normal"); policyPdf.setFontSize(10); 
            policyPdf.text("To ensure a smooth transition for employees leaving the company, safeguard company assets, and maintain data security.", margin, y, { maxWidth: contentWidth });
            y += 12;

            y = checkPageBreak(policyPdf, y, 20);
            policyPdf.setFont("helvetica", "bold"); policyPdf.setFontSize(11); policyPdf.text("Scope", margin, y); y += 6;
            policyPdf.setFont("helvetica", "normal"); policyPdf.setFontSize(10); 
            policyPdf.text("This policy applies to all employees who are exiting Equinox Group Holdings, Inc.", margin, y);
            y += 15;

            y = checkPageBreak(policyPdf, y, 40);
            policyPdf.setFont("helvetica", "bold"); policyPdf.setFontSize(11); policyPdf.text("Procedure", margin, y); y += 8;
            policyPdf.setFontSize(10);
            
            const procedureSections = [
                { t: "Uninstallation of Euphoria App and Office products:", d: "The Equinox Group Holdings Inc. IT support will ensure that the Euphoria app, Outlook, Teams & OneDrive is uninstalled from all company and personal devices used by the departing employee." },
                { t: "Return of Company Property", d: "The departing employee must return all company property, including but not limited to:", list: ["Company-issued phone", "Laptop", "Any other equipment or materials provided by the company"] },
                { t: "Data Removal", d: "The Equinox Group Holdings Inc. IT support will take all necessary steps to remove company data from non company property. This includes:", list: ["Ensuring that all company-related files, emails, and applications are deleted", "Verifying no data remains on external storage devices used by the employee"] },
                { t: "Email Forwarding", d: "The Equinox Group Holdings Inc. IT support will set up necessary email forwarding to ensure that any important communications are redirected to the appropriate personnel." },
                { t: "Final Checklist", d: "The Equinox Group Holdings Inc. IT support will provide the departing employee with a final checklist to ensure all steps are completed. This checklist will include:", list: ["Confirm uninstallation of Euphoria app and Office products", "Confirm return of all company property", "Verify data removal from personal devices", "Confirm email forwarding setup"] }
            ];

            const lineHeight = 5;
            procedureSections.forEach(sec => {
                y = checkPageBreak(policyPdf, y, 20);
                policyPdf.setFont("helvetica", "bold"); policyPdf.text(sec.t, margin, y); y += lineHeight;
                policyPdf.setFont("helvetica", "normal");
                const lines = policyPdf.splitTextToSize(sec.d, contentWidth);
                policyPdf.text(lines, margin, y);
                y += (lines.length * lineHeight);
                
                if (sec.list) {
                    sec.list.forEach(li => {
                        y = checkPageBreak(policyPdf, y, 6);
                        policyPdf.text("• " + li, margin + 5, y);
                        y += lineHeight;
                    });
                }
                y += 4;
            });

            // Data Retention Section
            y = checkPageBreak(policyPdf, y, 30);
            policyPdf.setLineWidth(0.5);
            policyPdf.line(margin, y, pageWidth - margin, y); y += 10;
            
            policyPdf.setFont("helvetica", "bold"); policyPdf.setFontSize(11); 
            policyPdf.text("Data & System Access After Offboarding", margin, y); y += 10;
            
            const retentionDetails = [
                { 
                    t: "1. Email (Outlook / Microsoft 365 Mailbox)", 
                    h: "What happens:",
                    l: ["Your mailbox will be disabled on your last working day.", "Your manager or designated successor will receive full access for business continuity.", "Auto reply and forwarding (if applicable) will be configured according to company policy.", "Your mailbox will be retained for 12 months according to Equinox Group Holdings, Inc.'s retention policies."],
                    i: "You will no longer have access after offboarding is completed."
                },
                {
                    t: "2. OneDrive Files",
                    h: "What happens:",
                    l: ["Ownership of your OneDrive files will be transferred to your manager.", "Your manager will have access for 7 days to review and relocate required business related files.", "After the retention period, your OneDrive and its contents will be deleted following company policy."],
                    i: "Personal files may be exported only after IT review and formal approval."
                },
                {
                    t: "3. Teams Chats & Teams Files",
                    h: "Teams Chats:",
                    l: ["Private Teams chats remain stored according to compliance and retention rules.", "No one receives direct access to your private chat history unless legally required."],
                    h2: "Teams Files:",
                    l2: ["Files in Teams channels remain accessible to the team.", "Files shared in private chats follow OneDrive transfer rules."]
                },
                {
                    t: "4. SharePoint & Network Drives",
                    l: ["All SharePoint documents remain part of their respective sites.", "Access permissions will be updated to remove you from shared folders, groups, and sites."]
                },
                {
                    t: "5. Applications & SaaS Platforms",
                    h: "For any third party systems (e.g., MS365, Euphoria, Payspace, Fusion):",
                    l: ["Your access will be fully removed.", "Active tasks or projects may be reassigned to your department.", "All content created remains the intellectual property of Equinox Group Holdings, Inc."]
                },
                {
                    t: "6. Personal Data on Company Devices",
                    h: "If you stored personal files on company equipment:",
                    l: ["You may request a Personal Data Review before your last day.", "IT will help identify items that may be transferred, while ensuring no corporate data is removed."]
                }
            ];

            policyPdf.setFontSize(9);
            retentionDetails.forEach(sec => {
                const estHeight = 30 + (sec.l ? sec.l.length * 5 : 0);
                y = checkPageBreak(policyPdf, y, estHeight);
                
                policyPdf.setFont("helvetica", "bold"); policyPdf.text(sec.t, margin, y); y += 6;
                if (sec.h) { policyPdf.text(sec.h, margin, y); y += 5; }
                
                policyPdf.setFont("helvetica", "normal");
                if (sec.l) {
                    sec.l.forEach(li => {
                        const liLines = policyPdf.splitTextToSize(li, contentWidth - 10);
                        policyPdf.text("• ", margin + 5, y);
                        policyPdf.text(liLines, margin + 10, y);
                        y += (liLines.length * 4.5);
                    });
                }
                
                if (sec.h2) { y += 2; policyPdf.setFont("helvetica", "bold"); policyPdf.text(sec.h2, margin, y); y += 5; policyPdf.setFont("helvetica", "normal"); }
                if (sec.l2) {
                    sec.l2.forEach(li => {
                        const liLines = policyPdf.splitTextToSize(li, contentWidth - 10);
                        policyPdf.text("• ", margin + 5, y);
                        policyPdf.text(liLines, margin + 10, y);
                        y += (liLines.length * 4.5);
                    });
                }

                if (sec.i) {
                    policyPdf.setFont("helvetica", "italic");
                    policyPdf.text(sec.i, margin, y);
                    y += 6;
                }
                y += 5;
            });

            // Signatures Section
            y = checkPageBreak(policyPdf, y, 50);
            y += 10;
            policyPdf.setFont("helvetica", "bold"); policyPdf.setFontSize(12); policyPdf.text("Formal Acknowledgment", margin, y); y += 15;
            policyPdf.setLineWidth(0.5);
            policyPdf.line(margin, y, margin + 70, y); policyPdf.line(pageWidth - margin - 70, y, pageWidth - margin, y); y += 6;
            policyPdf.setFontSize(9); 
            policyPdf.text("Equinox Group Holdings Inc. IT Support", margin, y);
            policyPdf.text(user.displayName, pageWidth - margin, y, { align: "right" });
            
            policyPdf.addImage(adminSignature, 'JPEG', margin, y - 22, 50, 15, undefined, 'FAST');
            policyPdf.addImage(policySignature, 'JPEG', pageWidth - margin - 50, y - 22, 50, 15, undefined, 'FAST');

            const policyBlob = policyPdf.output('blob');

            // --- PDF 2: CHECKLIST (MATCHING manual checklist/page.tsx) ---
            setStatus("Generating Official Checklist...");
            const checklistPdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            y = 20;
            // Header
            if (logoBase64) checklistPdf.addImage(logoBase64, 'PNG', margin, 15, 35, 12, undefined, 'FAST');
            checklistPdf.setFont("helvetica", "bold");
            checklistPdf.setFontSize(16);
            checklistPdf.text("IT Exit Interview Checklist", pageWidth - margin, 25, { align: "right" });
            checklistPdf.line(margin, 32, pageWidth - margin, 32);

            // User Info Section
            y = 45;
            checklistPdf.setFontSize(10); 
            checklistPdf.text("User Information", margin, y); y += 4;
            checklistPdf.line(margin, y, pageWidth - margin, y); y += 6;
            const userInfo = [
                ["Username:", user.displayName],
                ["Email:", userDetails.email],
                ["Device:", userDetails.device],
                ["Last Day:", userDetails.lastDay]
            ];
            const infoLineHeight = 5;
            userInfo.forEach(info => {
                y = checkPageBreak(checklistPdf, y, 10);
                checklistPdf.setFont("helvetica", "bold"); 
                checklistPdf.text(info[0], margin + 5, y);
                
                checklistPdf.setFont("helvetica", "normal");
                const valLines = checklistPdf.splitTextToSize(info[1] || "---", contentWidth - 50);
                checklistPdf.text(valLines, margin + 45, y);
                y += Math.max(7, valLines.length * infoLineHeight + 2);
            });

            // IT Admin Section
            y = checkPageBreak(checklistPdf, y, 20);
            y += 5;
            checklistPdf.setFont("helvetica", "bold"); checklistPdf.text("IT Administrative", margin, y); y += 4;
            checklistPdf.line(margin, y, pageWidth - margin, y); y += 6;
            const adminRows = [
                [`Shared mailbox created:`, itAdmin.sharedMailbox || "---"],
                [`Email forward or shared mailbox members:`, itAdmin.emailForward || "---"],
                [`Remove MS365 License:`, itAdmin.removeLicense ? "Yes" : "No"],
                [`Remove from all groups on AD:`, itAdmin.removeFromGroups ? "Yes" : "No"],
                [`Company data removal:`, itAdmin.dataRemoval],
                [`Clear MFA Settings:`, itAdmin.clearMFA ? "Yes" : "No"],
                [`Device Login Pin:`, itAdmin.devicePin || "---"]
            ];
            adminRows.forEach(row => {
                y = checkPageBreak(checklistPdf, y, 10);
                checklistPdf.setFont("helvetica", "normal"); 
                checklistPdf.text(row[0], margin + 5, y);
                
                checklistPdf.setFont("helvetica", "bold");
                // Label x is margin+5 (~25). Value x moved to margin+90 (~110) to avoid overlap.
                const valLines = checklistPdf.splitTextToSize(row[1] || "---", contentWidth - 95);
                checklistPdf.text(valLines, margin + 90, y);
                y += Math.max(7, valLines.length * infoLineHeight + 1);
            });

            // Checklist Verification (Section 1 & 2)
            y = checkPageBreak(checklistPdf, y, 20);
            y += 8;
            checklistPdf.setFont("helvetica", "bold"); checklistPdf.text("Verification Items", margin, y); y += 4;
            checklistPdf.line(margin, y, pageWidth - margin, y); y += 7;
            checklistPdf.setFontSize(8.5);

            checklist.forEach((item, i) => {
                const lines = checklistPdf.splitTextToSize(item.label, contentWidth - 15);
                y = checkPageBreak(checklistPdf, y, lines.length * 6 + 4);
                
                checklistPdf.rect(margin + 5, y - 3, 4, 4); // Checkbox
                if (item.checked) {
                    checklistPdf.setFont("zapfdingbats");
                    checklistPdf.text('4', margin + 5.5, y - 0.5); // Checkmark (ZapfDingbats '4' is check)
                    checklistPdf.setFont("helvetica");
                }
                checklistPdf.text(lines, margin + 12, y);
                y += (lines.length * 6) + 2;
            });

            // Final Signatures
            y = checkPageBreak(checklistPdf, y, 50);
            y += 15;
            checklistPdf.setFont("helvetica", "bold"); checklistPdf.setFontSize(12); checklistPdf.text("Formal Acknowledgment", margin, y); y += 15;
            checklistPdf.setLineWidth(0.5);
            checklistPdf.line(margin, y, margin + 70, y); checklistPdf.line(pageWidth - margin - 70, y, pageWidth - margin, y); y += 6;
            checklistPdf.setFontSize(9); 
            checklistPdf.text("Equinox Group Holdings Inc. IT Support", margin, y);
            checklistPdf.text(user.displayName, pageWidth - margin, y, { align: "right" });
            
            checklistPdf.addImage(adminSignature, 'JPEG', margin, y - 22, 50, 15, undefined, 'FAST');
            checklistPdf.addImage(policySignature, 'JPEG', pageWidth - margin - 50, y - 22, 50, 15, undefined, 'FAST');

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
                            
                            <div className="bg-white p-12 rounded-2xl shadow-xl text-slate-900 text-[11pt] space-y-8 leading-relaxed font-sans max-h-[70vh] overflow-y-auto">
                                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                                    <img src="/Equinox-Logo-Transparent.png" alt="Logo" className="h-16 w-auto" />
                                    <h4 className="text-xl font-bold uppercase tracking-tight">IT Offboarding Policy</h4>
                                </div>

                                <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-xs border border-slate-900 p-6 mb-8">
                                    <span className="font-bold">Policy Owner:</span>
                                    <span>Group IT Support Specialist</span>
                                    <span className="font-bold">Subject Personnel:</span>
                                    <span className="font-semibold text-blue-800">{user.displayName}</span>
                                    <span className="font-bold">Job Title:</span>
                                    <span>{userDetails.jobTitle}</span>
                                    <span className="font-bold">Last Working Day:</span>
                                    <span className="font-semibold">{userDetails.lastDay}</span>
                                </div>

                                <section>
                                    <h5 className="font-bold text-lg mb-2 underline decoration-blue-500/30">Purpose</h5>
                                    <p>To ensure a smooth transition for employees leaving the company, safeguard company assets, and maintain data security.</p>
                                </section>

                                <section>
                                    <h5 className="font-bold text-lg mb-2 underline decoration-blue-500/30">Scope</h5>
                                    <p>This policy applies to all employees who are exiting Equinox Group Holdings, Inc.</p>
                                </section>

                                <section className="space-y-6">
                                    <h5 className="font-bold text-lg mb-2 underline decoration-blue-500/30">Procedure</h5>
                                    
                                    <div>
                                        <p className="font-bold mb-1">Uninstallation of Euphoria App and Office products:</p>
                                        <p>The Equinox Group Holdings Inc. IT support will ensure that the Euphoria app, Outlook, Teams & OneDrive is uninstalled from all company and personal devices used by the employee.</p>
                                    </div>

                                    <div>
                                        <p className="font-bold mb-1">Return of Company Property:</p>
                                        <ul className="list-disc pl-8 space-y-1">
                                            <li>Company-issued phone</li>
                                            <li>Laptop</li>
                                            <li>Any other equipment or materials provided by the company</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <p className="font-bold mb-1">Data Removal:</p>
                                        <p>IT support will take all necessary steps to remove company data from non company property, ensuring all company-related files, emails, and applications are deleted.</p>
                                    </div>

                                    <div>
                                        <p className="font-bold mb-1">Email Forwarding:</p>
                                        <p>IT support will set up necessary email forwarding to ensure important communications are redirected appropriately.</p>
                                    </div>
                                </section>

                                <div className="pt-8 border-t-2 border-slate-900 space-y-6">
                                    <h5 className="font-bold text-lg">Data & System Access After Offboarding</h5>
                                    
                                    <div className="space-y-4 text-xs bg-slate-50 p-6 rounded-xl border border-slate-100 italic">
                                        <p><strong>1. Email:</strong> Mailbox disabled on last day; manager/successor receives access; retained for 12 months.</p>
                                        <p><strong>2. OneDrive:</strong> Ownership transferred to manager; access for 7 days; deleted thereafter.</p>
                                        <p><strong>3. Teams:</strong> Private chats retained for compliance; channel files remain in team; shared files follow OneDrive rules.</p>
                                        <p><strong>4. SharePoint:</strong> Documents remain on sites; access removed from groups/sites.</p>
                                        <p><strong>5. SaaS Platforms:</strong> Access fully removed (MS365, Euphoria, Fusion etc).</p>
                                        <p><strong>6. Personal Data:</strong> Personal files may be exported only after IT review and formal approval.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CHECKLIST & IT ADMIN */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 text-left pb-12">
                            <div className="bg-emerald-600/10 p-6 rounded-2xl border border-emerald-500/20">
                                <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                    <ListChecks size={20} /> Exit Interview Verification
                                </h3>
                                <p className="text-xs text-emerald-300/60 leading-relaxed italic">Complete all sections to ensure compliant archival.</p>
                            </div>

                            {/* USER INFORMATION DISPLAY */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">User Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div><p className="text-slate-500 mb-1">Username</p><p className="text-white font-bold">{user.displayName}</p></div>
                                    <div><p className="text-slate-500 mb-1">Email</p><p className="text-white font-bold">{userDetails.email}</p></div>
                                    <div><p className="text-slate-500 mb-1">Device Name</p><p className="text-white font-bold">{userDetails.device || "---"}</p></div>
                                    <div><p className="text-slate-500 mb-1">Last Day</p><p className="text-white font-bold">{userDetails.lastDay}</p></div>
                                </div>
                            </div>

                            {/* SECTION 1: TO BE COMPLETED WITH USER */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
                                <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center gap-2">
                                    <Shield size={14} className="text-blue-500" />
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Section 1: Completed with User</h4>
                                </div>
                                {checklist.filter(i => i.section === 1).map(item => (
                                    <div 
                                        key={item.id} 
                                        className={`p-4 flex items-start gap-4 transition-all group ${item.checked ? 'bg-emerald-500/5' : 'hover:bg-slate-800/50'}`}
                                    >
                                        <div 
                                            className={`mt-1 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'}`}
                                            onClick={() => handleCheck(item.id)}
                                        >
                                            {item.checked && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                        <input 
                                            className={`flex-1 bg-transparent border-0 outline-none text-[12px] leading-tight ${item.checked ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}
                                            value={item.label}
                                            onChange={e => editItemLabel(item.id, e.target.value)}
                                        />
                                        {item.id > 100 && ( // Allow removing custom items
                                            <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"><X size={14} /></button>
                                        )}
                                    </div>
                                ))}
                                <button 
                                    onClick={() => addCustomItem(1)}
                                    className="w-full py-3 text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold border-t border-slate-800 transition-all"
                                >
                                    + Add Custom Requirement
                                </button>
                            </div>

                            {/* SECTION 2: ASSETS RETURNED */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
                                <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center gap-2">
                                    <Laptop size={14} className="text-indigo-500" />
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Section 2: Assets Returned</h4>
                                </div>
                                {checklist.filter(i => i.section === 2).map(item => (
                                    <div 
                                        key={item.id} 
                                        className={`p-4 flex items-center gap-4 transition-all group ${item.checked ? 'bg-indigo-500/5' : 'hover:bg-slate-800/50'}`}
                                    >
                                        <div 
                                            className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${item.checked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-700'}`}
                                            onClick={() => handleCheck(item.id)}
                                        >
                                            {item.checked && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                        <input 
                                            className={`flex-1 bg-transparent border-0 outline-none text-[12px] ${item.checked ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}
                                            value={item.label}
                                            onChange={e => editItemLabel(item.id, e.target.value)}
                                        />
                                        {item.id > 1000 && ( // Allow removing custom items
                                            <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"><X size={14} /></button>
                                        )}
                                    </div>
                                ))}
                                <button 
                                    onClick={() => addCustomItem(2)}
                                    className="w-full py-3 text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold border-t border-slate-800 transition-all"
                                >
                                    + Add Custom Asset
                                </button>
                            </div>

                            {/* IT ADMINISTRATIVE */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
                                    <RefreshCw size={14} /> IT Administrative Tasks
                                </h4>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase">Shared Mailbox Created</label>
                                            <input 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                                                value={itAdmin.sharedMailbox}
                                                onChange={e => setItAdmin(prev => ({...prev, sharedMailbox: e.target.value}))}
                                                placeholder="e.g. Successor Name"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase">Email Forward / Members</label>
                                            <input 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                                                value={itAdmin.emailForward}
                                                onChange={e => setItAdmin(prev => ({...prev, emailForward: e.target.value}))}
                                                placeholder="e.g. manager@eqn.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase">Device Login PIN</label>
                                            <input 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                                                value={itAdmin.devicePin}
                                                onChange={e => setItAdmin(prev => ({...prev, devicePin: e.target.value}))}
                                                placeholder="Last known PIN..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 pt-2">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0"
                                                checked={itAdmin.removeLicense}
                                                onChange={e => setItAdmin(prev => ({...prev, removeLicense: e.target.checked}))}
                                            />
                                            <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors">Remove MS365 License</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0"
                                                checked={itAdmin.removeFromGroups}
                                                onChange={e => setItAdmin(prev => ({...prev, removeFromGroups: e.target.checked}))}
                                            />
                                            <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors">Remove from all groups on AD</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0"
                                                checked={itAdmin.clearMFA}
                                                onChange={e => setItAdmin(prev => ({...prev, clearMFA: e.target.checked}))}
                                            />
                                            <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors">Clear MFA Settings</span>
                                        </label>
                                    </div>

                                    <div className="pt-2">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-3">Company Data Removal Confirmation</p>
                                        <div className="flex gap-4">
                                            {["Yes", "No", "Retained till specified"].map(opt => (
                                                <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="radio" 
                                                        name="dataRemoval"
                                                        className="w-4 h-4 border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                                                        checked={itAdmin.dataRemoval === opt}
                                                        onChange={() => setItAdmin(prev => ({...prev, dataRemoval: opt}))}
                                                    />
                                                    <span className={`text-[11px] transition-colors ${itAdmin.dataRemoval === opt ? 'text-emerald-400 font-bold' : 'text-slate-500 group-hover:text-slate-300'}`}>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
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
