"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, UploadCloud, X, ChevronRight, ChevronLeft, RefreshCw, Smartphone, ListChecks, ShieldCheck, Mail, Laptop, Shield, UserX, UserMinus } from 'lucide-react';
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
    const [logs, setLogs] = useState<string[]>([]);
    const [links, setLinks] = useState<string[]>([]);
    const [policySignature, setPolicySignature] = useState("");
    const [adminSignature, setAdminSignature] = useState("");
    
    const scrollRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step]);

    const [userDetails, setUserDetails] = useState({
        email: user.mail || user.userPrincipalName || "",
        device: "",
        jobTitle: user.jobTitle || "________________________",
        lastDay: user.lastWorkingDay || new Date().toLocaleDateString()
    });

    const [itAdmin, setItAdmin] = useState({
        sharedMailboxCreated: false,
        personalEmail: "",
        emailForward: "",
        removeLicense: true,
        devicePin: "",
        deviceCondition: "Good"
    });

    const [checklist, setChecklist] = useState([
        // Section 1: Return of Company Assets
        { id: 101, section: 1, label: "Laptop / Desktop", checked: false },
        { id: 102, section: 1, label: "Power Supply", checked: false },
        { id: 103, section: 1, label: "External Peripherals (mouse, keyboard, headset, adapters)", checked: false },
        { id: 104, section: 1, label: "Mobile Phone / SIM Card", checked: false },
        { id: 105, section: 1, label: "Access Cards / Security Tokens", checked: false },
        { id: 106, section: 1, label: "Laptop Bag", checked: false },
        
        // Section 2: Personal Device & Data Cleanup
        { id: 201, section: 2, label: "Uninstalled Euphoria App, Outlook, Teams, and OneDrive from personal devices.", checked: false },
        { id: 202, section: 2, label: "Verified no company data remains on any personal external storage devices.", checked: false },
        { id: 203, section: 2, label: "Personal files stored on company equipment reviewed and approved.", checked: false },
        { id: 204, section: 2, label: "System Access Removed: SharePoint, VPN, Distribution Lists, Jira, SAP, Slack.", checked: false },
        { id: 205, section: 2, label: "Device Security: Device wiped, security logs reviewed.", checked: false },
        
        // Section 3: Account Deactivation & Data Handling
        { id: 301, section: 3, label: "Microsoft 365 Account Disabled: Sign-in blocked and MFA/Authenticator removed.", checked: false },
        { id: 302, section: 3, label: "Email Routing: Mailbox access transferred, forwarding configured. Retained 12 months.", checked: false },
        { id: 303, section: 3, label: "OneDrive Transfer: Ownership transferred for 7 days, then deleted.", checked: false },
    ]);

    useEffect(() => {
        fetch('/api/devices')
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
            
            const getLogoBase64 = async () => {
                try {
                    // Check global backend settings first
                    const settingsRes = await fetch('/api/settings');
                    const settings = await settingsRes.json();
                    if (settings?.companyLogo) {
                        localStorage.setItem('eqn-company-logo', settings.companyLogo);
                        return settings.companyLogo;
                    } else {
                        localStorage.removeItem('eqn-company-logo');
                    }

                    // Default logo
                    const response = await fetch('/Equinox-Group-Holdings-Logo.png');
                    const blob = await response.blob();
                    return new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                } catch { return null; }
            };

            const logoBase64 = await getLogoBase64();
            setStatus("Generating Unified PDF...");

            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            let y = 35;

            const checkPageBreak = (currentY: number, needed: number) => {
                if (currentY + needed > pageHeight - 20) {
                    pdf.addPage();
                    return 30;
                }
                return currentY;
            };
            
            if (logoBase64) {
                pdf.addImage(logoBase64, 'PNG', margin, 12, 45, 18, undefined, 'FAST');
            }
            
            // Main Title
            pdf.setTextColor("#0f172a"); // Dark slate
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            pdf.text("IT OFFBOARDING POLICY", pageWidth - margin, 22, { align: "right" });
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor("#64748b");
            pdf.text("Confidential & Proprietary", pageWidth - margin, 28, { align: "right" });
            
            // Header line
            pdf.setDrawColor(226, 232, 240); // slate-200
            pdf.setLineWidth(1);
            pdf.line(margin, 35, pageWidth - margin, 35);

            y = 45;
            pdf.setTextColor("#0f172a");
            
            const writeField = (label: string, value: string, rowY: number) => {
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "bold"); 
                pdf.text(label, margin + 5, rowY); 
                pdf.setFont("helvetica", "normal"); 
                pdf.text(value, margin + 45, rowY);
                pdf.setDrawColor(241, 245, 249); // slate-100
                pdf.setLineWidth(0.5);
                pdf.line(margin + 5, rowY + 3, pageWidth - margin - 5, rowY + 3);
            };

            pdf.setLineWidth(0.5);
            pdf.setDrawColor(203, 213, 225); // slate-300
            pdf.setFillColor(248, 250, 252); // slate-50
            pdf.roundedRect(margin, y, contentWidth, 52, 2, 2, 'FD');
            
            writeField("Company:", "Equinox Group Holdings, Inc.", y + 8);
            writeField("Employee Name:", user.displayName || "________________________", y + 16);
            writeField("Job Title:", userDetails.jobTitle || "________________________", y + 24);
            writeField("Department:", user.department || "________________________", y + 32);
            writeField("Last Working Day:", userDetails.lastDay, y + 40);
            writeField("Device PIN/Pass:", itAdmin.devicePin || "________________________", y + 48);
            
            y += 65;

            const drawSectionHeader = (title: string) => {
                y = checkPageBreak(y, 15);
                pdf.setFillColor(241, 245, 249); // slate-100
                pdf.rect(margin, y - 5, contentWidth, 8, 'F');
                pdf.setFont("helvetica", "bold"); 
                pdf.setFontSize(10); 
                pdf.setTextColor("#0f172a");
                pdf.text(title.toUpperCase(), margin + 2, y); 
                y += 8;
            };

            drawSectionHeader("1. Policy Overview");
            pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor("#334155");
            pdf.text("Effective Date: 7 March 2025", margin, y); y += 5;
            const purposeLines = pdf.splitTextToSize("Purpose: Ensure a smooth transition for exiting employees, safeguard company assets, maintain data security, and clearly outline the data retention process.", contentWidth);
            pdf.text(purposeLines, margin, y); y += (purposeLines.length * 5);
            pdf.text("Scope: All exiting employees at Equinox Group Holdings, Inc.", margin, y); y += 10;

            const drawChecklistSection = (sectionId: number, title: string) => {
                drawSectionHeader(title);
                pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor("#334155");
                
                const items = checklist.filter(i => i.section === sectionId);
                items.forEach(item => {
                    const lines = pdf.splitTextToSize(item.label, contentWidth - 12);
                    y = checkPageBreak(y, lines.length * 5 + 4);
                    
                    pdf.setDrawColor(148, 163, 184);
                    pdf.setLineWidth(0.3);
                    pdf.rect(margin + 2, y - 3, 3.5, 3.5);
                    if (item.checked) {
                        pdf.setFont("zapfdingbats");
                        pdf.setFontSize(8);
                        pdf.setTextColor("#10b981"); // emerald-500
                        pdf.text('4', margin + 2.5, y - 0.2);
                        pdf.setFont("helvetica", "normal");
                        pdf.setFontSize(9);
                        pdf.setTextColor("#334155");
                    }
                    pdf.text(lines, margin + 8, y);
                    y += (lines.length * 5) + 2;
                });
                y += 4;
            };

            drawChecklistSection(1, "2. Return of Company Assets");
            pdf.setFont("helvetica", "bold"); pdf.text("Condition of devices: ", margin + 2, y); 
            pdf.setFont("helvetica", "normal"); pdf.text(itAdmin.deviceCondition, margin + 35, y); y += 10;
            
            drawChecklistSection(2, "3. Personal Device & Data Cleanup");
            drawChecklistSection(3, "4. Account Deactivation & Data Handling");

            const drawLegalSection = (title: string, textLines: string[]) => {
                y = checkPageBreak(y, textLines.length * 4.5 + 12);
                pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor("#0f172a");
                pdf.text(title, margin, y); y += 5;
                pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor("#334155");
                textLines.forEach(line => {
                    const wrapped = pdf.splitTextToSize(line, contentWidth - 4);
                    y = checkPageBreak(y, wrapped.length * 4.5);
                    pdf.text(wrapped, margin + 4, y);
                    y += (wrapped.length * 4.5) + 1;
                });
                y += 4;
            };

            drawSectionHeader("5. Data Retention & Access Policy");

            drawLegalSection("5.1 Email (Outlook / Microsoft 365 Mailbox)", [
                "• Your mailbox will be disabled on your last working day.",
                "• Your manager or designated successor will receive full access for business continuity.",
                "• Auto reply and forwarding (if applicable) will be configured according to company policy.",
                "• Your mailbox will be retained for 12 months according to Equinox Group Holdings, Inc.'s retention policies.",
                "• You will no longer have access after offboarding is completed."
            ]);

            drawLegalSection("5.2 OneDrive Files", [
                "• Ownership of your OneDrive files will be transferred to your manager.",
                "• Your manager will have access for 7 days to review and relocate required business related files.",
                "• After the retention period, your OneDrive and its contents will be deleted following company policy.",
                "• Personal files may be exported only after IT review and formal approval."
            ]);

            drawLegalSection("5.3 Teams Chats & Teams Files", [
                "Teams Chats:",
                "• Private Teams chats remain stored according to compliance and retention rules.",
                "• No one receives direct access to your private chat history unless legally required.",
                "Teams Files:",
                "• Files in Teams channels remain accessible to the team.",
                "• Files shared in private chats follow OneDrive transfer rules."
            ]);

            drawLegalSection("5.4 SharePoint & Network Drives", [
                "• All SharePoint documents remain part of their respective sites.",
                "• Access permissions will be updated to remove you from shared folders, groups, and sites."
            ]);

            drawLegalSection("5.5 Applications & SaaS Platforms", [
                "For any third party systems (e.g., Jira, Freshservice, SAP, Slack):",
                "• Your access will be fully removed.",
                "• Active tasks or projects may be reassigned to your department.",
                "• All content created remains the intellectual property of Equinox Group Holdings, Inc."
            ]);

            drawLegalSection("5.6 Personal Data on Company Devices", [
                "If you stored personal files on company equipment:",
                "• You may request a Personal Data Review before your last day.",
                "• IT will help identify items that may be transferred, while ensuring no corporate data is removed."
            ]);

            y = checkPageBreak(y, 70); // Ensure the entire acknowledgement and signature block fits
            drawSectionHeader("6. Final Employee Acknowledgement");
            pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor("#334155");
            
            const ackLines = pdf.splitTextToSize("I, the departing employee, acknowledge and confirm that: 1) All company property issued to me has been returned in the condition noted above. 2) All access to corporate systems will be permanently removed on or after my last working day. 3) I retain no company data on personal devices, email accounts, or storage media. 4) I understand that all content created remains the intellectual property of Equinox Group Holdings, Inc., and any remaining data will be handled according to the company's retention policies.", contentWidth);
            pdf.text(ackLines, margin, y); y += (ackLines.length * 5) + 20;
            
            pdf.setLineWidth(0.5);
            pdf.setDrawColor(203, 213, 225);
            pdf.line(margin, y, margin + 70, y); 
            pdf.line(pageWidth - margin - 70, y, pageWidth - margin, y); 
            y += 6;
            
            pdf.setFontSize(8); 
            pdf.setTextColor("#64748b");
            pdf.text("Equinox Group Holdings Inc. IT Support", margin, y);
            pdf.text(user.displayName, pageWidth - margin, y, { align: "right" });
            
            pdf.addImage(adminSignature, 'JPEG', margin + 10, y - 25, 40, 15, undefined, 'FAST');
            pdf.addImage(policySignature, 'JPEG', pageWidth - margin - 60, y - 25, 40, 15, undefined, 'FAST');

            const pdfBlob = pdf.output('blob');

            setStatus("Processing Backend Automation...");
            const formData = new FormData();
            formData.append('action', 'upload_and_automate');
            formData.append('userId', user.id);
            formData.append('userName', user.displayName);
            formData.append('userEmail', userDetails.email);
            formData.append('personalEmail', itAdmin.personalEmail);
            formData.append('emailForward', itAdmin.emailForward);
            formData.append('removeLicense', itAdmin.removeLicense.toString());
            const customFileName = `Equinox Group - Offboarding ${user.displayName} ${new Date().toISOString().split('T')[0]}.pdf`;
            formData.append('unifiedFile', pdfBlob, customFileName);

            const res = await fetch('/api/offboarding/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                if (data.links) setLinks(data.links);
                if (data.automationLogs) setLogs(data.automationLogs);
                setStatus("✅ Offboarding Complete!");
                setTimeout(() => {
                    if (!data.links) { onComplete(); onClose(); }
                }, 8000);
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

    const renderChecklistSection = (sectionId: number, title: string, icon: React.ReactNode) => (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden mb-6">
            <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center gap-2">
                {icon}
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{title}</h4>
            </div>
            {checklist.filter(i => i.section === sectionId).map(item => (
                <div key={item.id} className={`p-4 flex items-start gap-4 transition-all group ${item.checked ? 'bg-emerald-500/5' : 'hover:bg-slate-800/50'}`}>
                    <div 
                        className={`mt-1 flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}
                        onClick={() => handleCheck(item.id)}
                    >
                        {item.checked && <CheckCircle2 size={16} className="text-white" />}
                    </div>
                    <span 
                        className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-sm leading-snug transition-all break-words ${item.checked ? 'text-emerald-400/50 line-through' : 'text-slate-200 focus:bg-slate-800/50 p-1 -m-1 rounded cursor-text'}`}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={e => editItemLabel(item.id, e.currentTarget.textContent || "")}
                    >
                        {item.label}
                    </span>
                    <button onClick={() => removeItem(item.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400"><X size={16} /></button>
                </div>
            ))}
            <button onClick={() => addCustomItem(sectionId)} className="w-full py-3 text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold border-t border-slate-800">+ Add Item</button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col w-full h-[100dvh] overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-slate-900 border-b border-slate-800 p-4 md:p-6 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <Smartphone className="text-blue-500" size={24} />
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-white leading-tight uppercase tracking-tighter">Digital Offboarding</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.displayName}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all"><X size={24} /></button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-12 py-6 pb-40 md:pb-32 w-full">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 text-left">
                            <div className="bg-emerald-600/10 p-6 rounded-2xl border border-emerald-500/20">
                                <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2"><ListChecks size={20} /> Exit Checklist</h3>
                                <p className="text-xs text-emerald-300/60 italic">Complete all sections with the employee to ensure compliant archival.</p>
                            </div>

                            {renderChecklistSection(1, "1. Return of Company Assets", <Laptop size={14} className="text-blue-500"/>)}
                            {renderChecklistSection(2, "2. Personal Device & Data Cleanup", <Smartphone size={14} className="text-purple-500"/>)}
                            {renderChecklistSection(3, "3. Account Deactivation & Data Handling", <UserMinus size={14} className="text-red-500"/>)}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 text-left">
                            <div className="bg-indigo-600/10 p-6 rounded-2xl border border-indigo-500/20">
                                <h3 className="text-lg font-bold text-indigo-400 mb-2 flex items-center gap-2"><Shield size={20} /> IT Administrative Action</h3>
                                <p className="text-xs text-indigo-300/60 italic">Provide details for backend automation processing.</p>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="mt-1 w-6 h-6 rounded border-orange-500 bg-slate-950 text-orange-500 focus:ring-0 flex-shrink-0"
                                                checked={itAdmin.sharedMailboxCreated}
                                                onChange={e => setItAdmin(prev => ({...prev, sharedMailboxCreated: e.target.checked}))}
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-orange-400">Manual Step: Convert to Shared Mailbox</span>
                                                <p className="text-xs text-orange-300/70 mt-1">Please manually convert the user's mailbox to a Shared Mailbox in the Exchange Admin Center before clicking Complete. Have you done this?</p>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Employee Personal Email (For Copy)</label>
                                            <input 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none"
                                                value={itAdmin.personalEmail}
                                                onChange={e => setItAdmin(prev => ({...prev, personalEmail: e.target.value}))}
                                                placeholder="user@gmail.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Forward Incoming Mail To</label>
                                            <input 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none"
                                                value={itAdmin.emailForward}
                                                onChange={e => setItAdmin(prev => ({...prev, emailForward: e.target.value}))}
                                                placeholder="manager@domain.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Device condition</label>
                                            <select 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none"
                                                value={itAdmin.deviceCondition}
                                                onChange={e => setItAdmin(prev => ({...prev, deviceCondition: e.target.value}))}
                                            >
                                                <option>Good</option>
                                                <option>Fair</option>
                                                <option>Damaged</option>
                                                <option>Not Returned</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Device PIN/Pass</label>
                                            <input 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none"
                                                value={itAdmin.devicePin}
                                                onChange={e => setItAdmin(prev => ({...prev, devicePin: e.target.value}))}
                                                placeholder="Last known PIN"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-800">
                                        <label className="flex items-center gap-3 cursor-pointer group w-fit">
                                            <input 
                                                type="checkbox" 
                                                className="w-6 h-6 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 flex-shrink-0"
                                                checked={itAdmin.removeLicense}
                                                onChange={e => setItAdmin(prev => ({...prev, removeLicense: e.target.checked}))}
                                            />
                                            <span className="text-sm font-bold text-slate-300 group-hover:text-white">Automatically Remove MS365 Licenses</span>
                                        </label>
                                        <p className="text-xs text-slate-500 mt-2 pl-8">Note: Only check this if you have already converted the mailbox to a Shared Mailbox, otherwise the mailbox data will be queued for deletion.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 text-left">
                            <div className="bg-purple-600/10 p-6 rounded-2xl border border-purple-500/20 mb-8">
                                <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2"><UploadCloud size={20} /> Final Acknowledgment</h3>
                                <p className="text-xs text-purple-300/60 italic">Please review the Data Retention Policy and sign below to formally agree to the terms in the IT Offboarding Policy.</p>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 max-h-96 overflow-y-auto custom-scrollbar">
                                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-slate-800 pb-4 sticky top-0 bg-slate-900">Data Retention & Access Policy</h4>
                                
                                <div className="space-y-6 text-sm text-slate-300">
                                    <div>
                                        <h5 className="font-bold text-white mb-2 text-[12px] uppercase tracking-wider">Email (Outlook / Microsoft 365 Mailbox)</h5>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Your mailbox will be disabled on your last working day.</li>
                                            <li>Your manager or designated successor will receive full access for business continuity.</li>
                                            <li>Auto reply and forwarding (if applicable) will be configured according to company policy.</li>
                                            <li>Your mailbox will be retained for 12 months according to Equinox Group Holdings, Inc.'s retention policies.</li>
                                            <li>You will no longer have access after offboarding is completed.</li>
                                        </ul>
                                    </div>
                                    
                                    <div>
                                        <h5 className="font-bold text-white mb-2 text-[12px] uppercase tracking-wider">OneDrive Files</h5>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Ownership of your OneDrive files will be transferred to your manager.</li>
                                            <li>Your manager will have access for 7 days to review and relocate required business related files.</li>
                                            <li>After the retention period, your OneDrive and its contents will be deleted following company policy.</li>
                                            <li>Personal files may be exported only after IT review and formal approval.</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h5 className="font-bold text-white mb-2 text-[12px] uppercase tracking-wider">Teams Chats & Teams Files</h5>
                                        <p className="font-bold text-xs mt-1 text-slate-400">Teams Chats:</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Private Teams chats remain stored according to compliance and retention rules.</li>
                                            <li>No one receives direct access to your private chat history unless legally required.</li>
                                        </ul>
                                        <p className="font-bold text-xs mt-2 text-slate-400">Teams Files:</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Files in Teams channels remain accessible to the team.</li>
                                            <li>Files shared in private chats follow OneDrive transfer rules.</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h5 className="font-bold text-white mb-2 text-[12px] uppercase tracking-wider">SharePoint & Network Drives</h5>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>All SharePoint documents remain part of their respective sites.</li>
                                            <li>Access permissions will be updated to remove you from shared folders, groups, and sites.</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h5 className="font-bold text-white mb-2 text-[12px] uppercase tracking-wider">Applications & SaaS Platforms</h5>
                                        <p className="text-xs mb-1 text-slate-400">For any third party systems (e.g., Jira, Freshservice, SAP, Slack):</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Your access will be fully removed.</li>
                                            <li>Active tasks or projects may be reassigned to your department.</li>
                                            <li>All content created remains the intellectual property of Equinox Group Holdings, Inc.</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h5 className="font-bold text-white mb-2 text-[12px] uppercase tracking-wider">Personal Data on Company Devices</h5>
                                        <p className="text-xs mb-1 text-slate-400">If you stored personal files on company equipment:</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>You may request a Personal Data Review before your last day.</li>
                                            <li>IT will help identify items that may be transferred, while ensuring no corporate data is removed.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-12">
                                <SignaturePad label={`Employee Signature (${user.displayName})`} onSave={setPolicySignature} />
                                <SignaturePad label="IT Admin Signature (Equinox Support)" onSave={setAdminSignature} />
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center space-y-8 min-h-[400px]">
                            {uploading ? (
                                <div className="flex flex-col items-center gap-6">
                                    <RefreshCw className="animate-spin text-blue-500" size={64} />
                                    <div className="text-center">
                                        <p className="text-xl font-black text-white uppercase tracking-tighter mb-2">{status}</p>
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
                                            disabled={!itAdmin.sharedMailboxCreated}
                                            className={`w-full md:px-12 py-4 text-white rounded-2xl text-lg font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-3 mx-auto ${
                                                itAdmin.sharedMailboxCreated 
                                                ? 'bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-600/20 active:scale-95' 
                                                : 'bg-slate-700 opacity-50 cursor-not-allowed'
                                            }`}
                                        >
                                            <UploadCloud size={24} /> {itAdmin.sharedMailboxCreated ? 'Finalize Offboarding' : 'Complete Manual Step First'}
                                        </button>
                                    )}
                                    {logs.length > 0 && (
                                        <div className="mt-6 text-left bg-slate-900 border border-slate-800 rounded-xl p-4 max-h-60 overflow-y-auto">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Automation Logs</p>
                                            <ul className="space-y-2 text-xs">
                                                {logs.map((log, i) => (
                                                    <li key={i} className={`flex items-start gap-2 ${log.toLowerCase().includes('failed') ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                        <span>{log.toLowerCase().includes('failed') ? '❌' : '✅'}</span>
                                                        <span>{log}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-4 md:p-6 flex flex-col sm:flex-row gap-3 fixed bottom-0 left-0 right-0 z-20 pb-safe">
                {step > 1 && step < 4 && (
                    <button onClick={prev} className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-slate-700 active:scale-95"><ChevronLeft size={18} /> Back</button>
                )}
                {step < 4 && (
                    <button 
                        onClick={next}
                        disabled={(step === 1 && checklist.some(i => !i.checked)) || (step === 2 && !itAdmin.sharedMailboxCreated)}
                        className={`flex-[2] flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 ${
                            ((step === 1 && checklist.some(i => !i.checked)) || (step === 2 && !itAdmin.sharedMailboxCreated))
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-200'
                        }`}
                    >
                        {step === 3 ? "Review & Finalize" : "Next Step"} <ChevronRight size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
