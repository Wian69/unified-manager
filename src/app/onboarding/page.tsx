'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    Search, 
    UserCircle, 
    Users, 
    CreditCard, 
    ListChecks, 
    Shield, 
    Zap, 
    ArrowRight, 
    ArrowLeft, 
    CheckCircle2, 
    Loader2, 
    Settings,
    Mail,
    Building2,
    MapPin,
    Key,
    AlertCircle,
    Phone,
    Plus,
    Trash2,
    Save,
    Layout,
    RefreshCw,
    FileText,
    Share2,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';

const STEPS = [
    { id: 1, title: 'Selection', icon: Search, description: 'Select User' },
    { id: 2, title: 'Profile', icon: UserCircle, description: 'Audit Identity' },
    { id: 3, title: 'Network', icon: Users, description: 'Groups' },
    { id: 4, title: 'Cloud', icon: CreditCard, description: 'Licensing' },
    { id: 5, title: 'Audit', icon: ListChecks, description: 'Readiness' }
];

const AuditField = ({ label, icon: Icon, value, placeholder = 'Unset' }: any) => (
    <div className="space-y-1.5 p-4 bg-slate-950/30 border border-white/5 rounded-2xl group hover:border-blue-500/30 transition-all">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">{label}</label>
        <div className="flex items-center gap-3">
            <Icon className="text-slate-700 group-hover:text-blue-500 transition-colors" size={14} />
            <span className={`text-xs font-bold truncate ${value ? 'text-white' : 'text-slate-800 italic'}`}>
                {value || placeholder}
            </span>
        </div>
    </div>
);

export default function OnboardingAuditWizard() {
    const [step, setStep] = useState(1);
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);
    
    // Master Template
    const [template, setTemplate] = useState<any[]>([]);
    const [loadingTemplate, setLoadingTemplate] = useState(true);
    const [savingTemplate, setSavingTemplate] = useState(false);

    // User Search & Selection
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // Entra Data context
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [availableSkus, setAvailableSkus] = useState<any[]>([]);

    // Per-User Checklist State
    const [userChecklist, setUserChecklist] = useState<Record<string, boolean>>({});
    const [loadingUserChecklist, setLoadingUserChecklist] = useState(false);
    const [savingUserChecklist, setSavingUserChecklist] = useState(false);

    // Archival State
    const [isArchiving, setIsArchiving] = useState(false);
    const [archiveUrl, setArchiveUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Initial Load: Master Template
    useEffect(() => {
        fetch('/api/onboarding/template')
            .then(res => res.json())
            .then(data => {
                setTemplate(data.template || []);
                setLoadingTemplate(false);
            })
            .catch(() => setLoadingTemplate(false));
    }, []);

    // Step 1: User Search
    useEffect(() => {
        const fetchUsers = async () => {
            if (searchTerm.length < 2) {
                setUsers([]);
                return;
            }
            setLoadingUsers(true);
            try {
                const res = await fetch(`/api/users?search=${searchTerm}`);
                const data = await res.json();
                setUsers(data.users || []);
            } catch (err) { console.error(err); } 
            finally { setLoadingUsers(false); }
        };

        const timer = setTimeout(fetchUsers, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Complex Selection: Fetch full user details (15+ fields)
    const handleSelectUser = async (userSummary: any) => {
        setLoadingUsers(true);
        try {
            // Fetch comprehensive profile from /[id] endpoint
            const profileRes = await fetch(`/api/users/${userSummary.id}`);
            const fullUser = await profileRes.json();
            setSelectedUser(fullUser);
            setStep(2);
            
            // Load user-specific checklist
            setLoadingUserChecklist(true);
            const res = await fetch(`/api/onboarding/checklist/${fullUser.id}`);
            const data = await res.json();
            setUserChecklist(data.checklist || {});
            setLoadingUserChecklist(false);

            // Pre-fetch contexts (Groups / Skus)
            fetch('/api/groups').then(res => res.json()).then(data => setAvailableGroups(data.groups || []));
            fetch('/api/onboarding/skus').then(res => res.json()).then(data => setAvailableSkus(data.skus || []));
        } catch (err) {
            console.error("Selection error", err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleNext = () => setStep(s => Math.min(s + 1, 5));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const toggleChecklistItem = async (id: string) => {
        const next = { ...userChecklist, [id]: !userChecklist[id] };
        setUserChecklist(next);
        
        setSavingUserChecklist(true);
        try {
            await fetch(`/api/onboarding/checklist/${selectedUser.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checklist: next })
            });
        } catch (err) { console.error(err); } 
        finally { setSavingUserChecklist(false); }
    };

    const handleSaveTemplate = async () => {
        setSavingTemplate(true);
        try {
            await fetch('/api/onboarding/template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template })
            });
            setIsEditingTemplate(false);
        } catch (err) { console.error(err); } 
        finally { setSavingTemplate(false); }
    };

    // SharePoint Archival: Generate PDF & Upload
    const handleArchiveToSharePoint = async () => {
        if (!selectedUser) return;
        setIsArchiving(true);
        setError(null);
        
        try {
            const doc = new jsPDF();
            const dateStr = new Date().toLocaleDateString();
            
            // Branding
            doc.setFontSize(22); doc.setTextColor(0, 51, 153);
            doc.text("EQN IT SYSTEM READINESS AUDIT", 20, 30);
            
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text(`Certificate of Operational Compliance | Generated: ${dateStr}`, 20, 38);
            
            // Identity Section
            doc.setDrawColor(200); doc.line(20, 45, 190, 45);
            doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("Identity Subject", 20, 55);
            
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            doc.text(`Employee Name: ${selectedUser.displayName}`, 20, 65);
            doc.text(`Target Entity: ${selectedUser.userPrincipalName}`, 20, 72);
            doc.text(`Job Title & Dept: ${selectedUser.jobTitle || 'N/A'} | ${selectedUser.department || 'N/A'}`, 20, 79);
            doc.text(`Primary Location: ${selectedUser.officeLocation || 'N/A'}`, 20, 86);
            
            // Audit Results Section
            doc.setFontSize(12); doc.setFont("helvetica", "bold");
            doc.text("System Audit Checklist Results", 20, 105);
            
            let y = 115;
            template.forEach((item, index) => {
                const isDone = userChecklist[item.id];
                doc.setFontSize(9); doc.setTextColor(isDone ? 0 : 200); doc.setFont("helvetica", isDone ? "bold" : "normal");
                const status = isDone ? "[DONE]" : "[PENDING]";
                doc.text(`${status} ${item.category}: ${item.title}`, 25, y);
                y += 7;
                if (y > 270) { doc.addPage(); y = 30; }
            });

            // Footer
            doc.setFontSize(8); doc.setTextColor(150);
            const footY = doc.internal.pageSize.height - 15;
            doc.text("Verified by Unified Manager Onboarding Audit System (v3.0)", 20, footY);
            
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], "audit.pdf", { type: "application/pdf" });
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userName', selectedUser.displayName);

            const res = await fetch('/api/onboarding/archive', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (res.ok) {
                setArchiveUrl(result.webUrl);
            } else {
                setError(result.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsArchiving(false);
        }
    };

    const categories = ['General', 'Enrollment', 'Applications', 'Configuration'];

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-700 pb-20 px-8">
            {/* Header / Meta */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 backdrop-blur-3xl shadow-2xl relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                    <Shield size={140} className="text-blue-500" />
                </div>

                <div className="relative z-10 space-y-2">
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                        Corporate <span className="text-blue-500 italic">Audit</span>
                    </h1>
                    {selectedUser ? (
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-white font-black uppercase text-xs tracking-widest bg-blue-600/20 px-4 py-1.5 rounded-full border border-blue-500/20 shadow-xl">{selectedUser.displayName}</span>
                        </div>
                    ) : (
                        <p className="text-slate-500 font-medium tracking-tight italic opacity-60">Complete enterprise readiness verification.</p>
                    )}
                </div>
                
                {/* Progress Indicators */}
                <div className="flex items-center gap-2 relative z-10">
                    {STEPS.map(s => (
                        <div key={s.id} className="flex items-center">
                            <div className={`w-14 h-14 rounded-[1.5rem] flex flex-col items-center justify-center transition-all group relative ${
                                step >= s.id ? 'bg-blue-600 text-white shadow-3xl shadow-blue-600/40' : 'bg-slate-950/50 text-slate-700 border border-slate-900'
                            }`}>
                                <s.icon size={22} className={step === s.id ? 'animate-pulse' : ''} />
                            </div>
                            {s.id < 5 && <div className={`w-10 h-1 transition-all ${step > s.id ? 'bg-blue-600' : 'bg-slate-950 opacity-30 shadow-inner'}`} />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Interaction Frame */}
                <div className="xl:col-span-9 bg-slate-900/50 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] shadow-4xl relative overflow-hidden flex flex-col min-h-[700px]">
                    
                    {/* Template Master Editor Action */}
                    {step === 5 && (
                        <div className="absolute top-10 right-10 z-20">
                            <button 
                                onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isEditingTemplate ? 'bg-rose-600 text-white shadow-xl rotate-1' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-500'
                                }`}
                            >
                                <Settings size={14} className={isEditingTemplate ? 'animate-spin' : ''} />
                                {isEditingTemplate ? 'EXIT DESIGN MODE' : 'MANAGE MASTER PROTOCOL'}
                            </button>
                        </div>
                    )}

                    <div className="p-16 relative z-10 flex-1">
                        <AnimatePresence mode="wait">
                            {/* Step 1: Global Identity Discovery */}
                            {step === 1 && (
                                <motion.div 
                                    key="step1" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                                    className="space-y-12 h-full flex flex-col justify-center"
                                >
                                    <div className="text-center space-y-4 max-w-2xl mx-auto">
                                        <div className="w-24 h-24 bg-blue-600/10 rounded-[3rem] flex items-center justify-center mx-auto text-blue-500 shadow-3xl shadow-blue-600/10 border border-blue-600/20 relative">
                                            <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full" />
                                            <Search size={48} className="relative z-10" />
                                        </div>
                                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Identity Lookup</h2>
                                        <p className="text-slate-500 text-lg font-medium italic max-w-sm mx-auto">Select a corporate entity to begin the readiness lifecycle audit.</p>
                                    </div>

                                    <div className="relative group max-w-3xl mx-auto w-full">
                                        <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors" size={30} />
                                        <input 
                                            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Find Employee (Name, Email, UPN)..."
                                            className="w-full bg-slate-950/80 border-2 border-slate-900 rounded-[2.5rem] py-8 pl-20 pr-8 text-2xl text-white placeholder:text-slate-800 focus:outline-none focus:border-blue-600 transition-all font-black"
                                        />
                                        {loadingUsers && (
                                            <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                <Loader2 className="animate-spin text-blue-600" size={32} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
                                        {users.map(u => (
                                            <motion.div 
                                                whileHover={{ y: -5, scale: 1.02 }}
                                                key={u.id} onClick={() => handleSelectUser(u)}
                                                className="p-8 bg-slate-950/40 border border-white/5 rounded-[2.5rem] hover:border-blue-600/40 hover:bg-blue-600/5 transition-all cursor-pointer group relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-10 transition-opacity">
                                                    <UserCircle size={100} />
                                                </div>
                                                <div className="flex flex-col items-center text-center gap-4 relative z-10">
                                                    <div className="w-16 h-16 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-2xl font-black text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                                                        {u.displayName.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0 w-full">
                                                        <div className="text-sm font-black text-white uppercase tracking-tight truncate">{u.displayName}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono truncate lowercase mt-1">{u.userPrincipalName}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-blue-500/40 uppercase tracking-widest group-hover:text-blue-500 transition-colors mt-2">
                                                        Start Audit Flow <ArrowRight size={10} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 2: Comprehensive Profile Audit (15+ Fields) */}
                            {step === 2 && (
                                <motion.div 
                                    key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-12"
                                >
                                    <div className="space-y-1 border-l-4 border-blue-600 pl-6">
                                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Entra Profile Audit</h2>
                                        <p className="text-slate-500 font-medium italic">Synchronizing 15+ corporate identity parameters for {selectedUser?.displayName}.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="col-span-full mb-2">
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] flex items-center gap-3">
                                                <UserPlus size={14} /> Core Identity Signature
                                            </h3>
                                        </div>
                                        <AuditField label="Full Name" icon={UserCircle} value={selectedUser?.displayName} />
                                        <AuditField label="UPN Email" icon={Mail} value={selectedUser?.userPrincipalName} />
                                        <AuditField label="Given Name" icon={Check} value={selectedUser?.givenName} />
                                        <AuditField label="Surname" icon={Check} value={selectedUser?.surname} />

                                        <div className="col-span-full mt-6 mb-2">
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] flex items-center gap-3">
                                                <Building2 size={14} /> Professional Placement
                                            </h3>
                                        </div>
                                        <AuditField label="Job Title" icon={Zap} value={selectedUser?.jobTitle} />
                                        <AuditField label="Department" icon={Building2} value={selectedUser?.department} />
                                        <AuditField label="Company" icon={Building2} value={selectedUser?.companyName} />
                                        <AuditField label="Office Location" icon={MapPin} value={selectedUser?.officeLocation} />

                                        <div className="col-span-full mt-6 mb-2">
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] flex items-center gap-3">
                                                <Phone size={14} /> Communication & Grid
                                            </h3>
                                        </div>
                                        <AuditField label="Mobile" icon={Phone} value={selectedUser?.mobilePhone} />
                                        <AuditField label="Bus. Phone" icon={Phone} value={selectedUser?.businessPhones?.[0]} />
                                        <div className="col-span-2">
                                            <AuditField label="Corporate Object ID" icon={Key} value={selectedUser?.id} />
                                        </div>

                                        <div className="col-span-full mt-6 mb-2">
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] flex items-center gap-3">
                                                <Home size={14} /> Geographic Metadata
                                            </h3>
                                        </div>
                                        <div className="col-span-2">
                                            <AuditField label="Street" icon={MapPin} value={selectedUser?.streetAddress} />
                                        </div>
                                        <AuditField label="City" icon={Globe} value={selectedUser?.city} />
                                        <AuditField label="Region/State" icon={Globe} value={selectedUser?.state} />
                                        <AuditField label="Postal" icon={MapPin} value={selectedUser?.postalCode} />
                                        <AuditField label="Country" icon={Globe} value={selectedUser?.country} />
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: Groups Cluster Audit */}
                            {step === 3 && (
                                <motion.div 
                                    key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <div className="space-y-1 text-center">
                                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Security Overlays</h2>
                                        <p className="text-slate-500 font-medium italic underline decoration-blue-600/30 decoration-2 underline-offset-8">Access clusters assigned in the tenant directory.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[450px] overflow-y-auto pr-6 custom-scrollbar">
                                        {availableGroups.sort((a, b) => a.displayName.localeCompare(b.displayName)).map(group => {
                                            const isMember = selectedUser?.memberOf?.some((m: any) => m.id === group.id);
                                            return (
                                                <div 
                                                    key={group.id}
                                                    className={`p-6 rounded-[2.5rem] border transition-all relative overflow-hidden group ${
                                                        isMember ? 'bg-blue-600/10 border-blue-600 shadow-2xl' : 'bg-slate-950/20 border-slate-900 opacity-40 grayscale'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4 relative z-10">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${
                                                            isMember ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-800'
                                                        }`}>
                                                            <Users size={20} />
                                                        </div>
                                                        <div className="text-left flex-1 min-w-0">
                                                            <div className="text-xs font-black text-white uppercase tracking-tight truncate leading-none mb-1">{group.displayName}</div>
                                                            <div className="text-[9px] text-slate-600 font-mono truncate">{group.id.split('-')[0]}...</div>
                                                        </div>
                                                        {isMember && <CheckCircle2 className="text-blue-500 shrink-0" size={18} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 4: Asset Licensing Audit */}
                            {step === 4 && (
                                <motion.div 
                                    key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <div className="space-y-1 text-center">
                                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Software Provisioning</h2>
                                        <p className="text-slate-500 font-medium italic underline decoration-emerald-600/30 decoration-2 underline-offset-8">Cloud service units active on this entity.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                        {availableSkus.map(sku => {
                                            const isAssigned = selectedUser?.assignedLicenses?.some((l: any) => l.skuId === sku.skuId);
                                            return (
                                                <div 
                                                    key={sku.skuId}
                                                    className={`p-8 rounded-[3rem] border transition-all ${
                                                        isAssigned ? 'bg-emerald-600/10 border-emerald-600 shadow-4xl shadow-emerald-500/10' : 'bg-slate-950/20 border-slate-900 opacity-40 grayscale'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-6">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center ${
                                                                isAssigned ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-800'
                                                            }`}>
                                                                <CreditCard size={24} />
                                                            </div>
                                                            <div className="text-left space-y-1">
                                                                <div className="text-sm font-black text-white uppercase tracking-tighter leading-none">{sku.friendlyName}</div>
                                                                <div className={`text-[10px] font-black uppercase tracking-widest italic ${isAssigned ? 'text-emerald-500' : 'text-slate-800'}`}>
                                                                    {isAssigned ? 'ACTIVE SUBSCRIPTION' : 'NOT ASSIGNED'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isAssigned && <CheckCircle2 className="text-emerald-500" size={30} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 5: Advanced Setup Audit (Master Protocol) */}
                            {step === 5 && (
                                <motion.div 
                                    key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-12 h-full flex flex-col"
                                >
                                    <div className="space-y-1 flex justify-between items-end">
                                        <div className="border-l-4 border-blue-600 pl-6">
                                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">System Readiness</h2>
                                            <p className="text-slate-500 font-medium italic">Tracking 30+ Enterprise setup protocols for {selectedUser?.displayName}.</p>
                                        </div>
                                        <div className="hidden md:block">
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">Audit Progress</p>
                                            <div className="w-48 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                                                    style={{ width: `${(Object.values(userChecklist).filter(Boolean).length / template.length) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {loadingTemplate || loadingUserChecklist ? (
                                         <div className="py-20 flex-1 flex flex-col items-center justify-center">
                                            <Loader2 size={40} className="animate-spin text-blue-500 mb-6" />
                                            <p className="text-xs font-black uppercase text-slate-500 tracking-[0.5em] animate-pulse">Syncing Enterprise State...</p>
                                         </div>
                                    ) : isEditingTemplate ? (
                                        <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-500 flex-1 overflow-y-auto custom-scrollbar pr-6 pb-10">
                                            <div className="p-8 bg-blue-600/10 border border-blue-600/30 rounded-[2.5rem] relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent" />
                                                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                                                    <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-2xl">
                                                        <Settings size={24} className="animate-spin-slow" />
                                                    </div>
                                                    <div className="flex-1 text-center md:text-left">
                                                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Master Protocol Design</h3>
                                                        <p className="text-slate-400 text-sm italic font-medium italic">Architecting the global requirement list for all future enterprise audits.</p>
                                                    </div>
                                                    <button onClick={handleSaveTemplate} disabled={savingTemplate} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-3xl shadow-blue-600/30 transition-all whitespace-nowrap flex items-center gap-3">
                                                       {savingTemplate ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Commit Logic
                                                    </button>
                                                </div>
                                            </div>

                                            {categories.map(cat => (
                                                <div key={cat} className="space-y-6">
                                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.6em]">{cat} Requirements</h3>
                                                        <button 
                                                            onClick={() => setTemplate([...template, { id: Math.random().toString(36).substr(2, 9), category: cat, title: 'New Requirement', detail: '', checked: false }])}
                                                            className="p-3 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-xl"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {template.filter(t => t.category === cat).map((item) => (
                                                            <div key={item.id} className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-3xl border border-white/5 group hover:border-slate-700 transition-all">
                                                                <input 
                                                                    type="text" value={item.title} 
                                                                    onChange={e => {
                                                                        const next = [...template];
                                                                        const target = next.find(i => i.id === item.id);
                                                                        if (target) target.title = e.target.value;
                                                                        setTemplate(next);
                                                                    }}
                                                                    className="flex-1 bg-transparent border-none text-white text-sm font-black focus:ring-0 px-4"
                                                                />
                                                                <input 
                                                                    type="text" value={item.detail || ''} 
                                                                    onChange={e => {
                                                                        const next = [...template];
                                                                        const target = next.find(i => i.id === item.id);
                                                                        if (target) target.detail = e.target.value;
                                                                        setTemplate(next);
                                                                    }}
                                                                    placeholder="Detail"
                                                                    className="w-32 bg-slate-900/50 border border-white/5 rounded-xl py-2 px-3 text-[10px] text-slate-500 font-bold focus:outline-none"
                                                                />
                                                                <button onClick={() => setTemplate(template.filter(i => i.id !== item.id))} className="p-3 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-12 flex-1 overflow-y-auto custom-scrollbar pr-8 pb-10">
                                            {categories.map(cat => (
                                                <div key={cat} className="space-y-5">
                                                    <div className="flex items-center gap-6">
                                                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.8em] flex-none italic">{cat} Phase</h3>
                                                        <div className="flex-1 h-[1px] bg-white/5" />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                        {template.filter(t => t.category === cat).map(item => {
                                                            const isChecked = !!userChecklist[item.id];
                                                            // Clean "Done" from display as per User Request
                                                            const displayDetail = item.detail && item.detail.toLowerCase() !== 'done' ? item.detail : null;
                                                            return (
                                                                <div 
                                                                    key={item.id}
                                                                    onClick={() => toggleChecklistItem(item.id)}
                                                                    className={`p-5 rounded-[2.5rem] border transition-all cursor-pointer flex items-center justify-between group h-full ${
                                                                        isChecked ? 'bg-emerald-600/10 border-emerald-600/40 shadow-3xl shadow-emerald-500/5' : 'bg-slate-950/20 border-white/5'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-5 min-w-0">
                                                                        <div className={`shrink-0 w-10 h-10 rounded-[1.25rem] flex items-center justify-center transition-all ${
                                                                            isChecked ? 'bg-emerald-600 text-white shadow-2xl scale-110' : 'bg-slate-900 border border-slate-800 text-slate-800 group-hover:text-slate-600'
                                                                        }`}>
                                                                            {isChecked ? <Check size={18} strokeWidth={4} className="animate-in zoom-in duration-300" /> : <div className="w-2 h-2 rounded-full bg-slate-800" />}
                                                                        </div>
                                                                        <div className="text-left font-black text-[13px] tracking-tight uppercase leading-[1.1] truncate overflow-hidden">
                                                                            <div className={isChecked ? 'text-white' : 'text-slate-600 group-hover:text-slate-300 tracking-tighter'}>{item.title}</div>
                                                                            {displayDetail && <div className="text-[9px] text-blue-500/50 mt-1 italic font-bold truncate opacity-80">{displayDetail}</div>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Master Navigation Console */}
                    {step > 1 && (
                        <div className="border-t border-white/5 p-12 flex flex-col md:flex-row justify-between items-center bg-slate-950/60 backdrop-blur-4xl shrink-0 mt-auto gap-8 relative overflow-hidden">
                             {/* Sync Progress Bar (Footer) */}
                             <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5" />
                             {savingUserChecklist && (
                                <div className="absolute top-0 left-0 h-1 bg-emerald-500/30 animate-pulse" style={{ width: '100%' }} />
                             )}

                            <button 
                                onClick={handleBack}
                                disabled={isEditingTemplate}
                                className={`flex items-center gap-4 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all bg-slate-900 border border-white/5 shadow-2xl ${
                                    isEditingTemplate ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:text-white hover:border-blue-600/30'
                                }`}
                            >
                                <ArrowLeft size={18} /> Reverse Phase
                            </button>

                            <div className="flex items-center gap-6">
                                {savingUserChecklist && (
                                    <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] animate-in fade-in slide-in-from-right-4">
                                        <RefreshCw size={14} className="animate-spin" />
                                        Syncing Directory...
                                    </div>
                                )}
                                
                                {step < 5 ? (
                                    <button 
                                        onClick={handleNext}
                                        disabled={isEditingTemplate}
                                        className={`flex items-center gap-6 bg-slate-900 hover:bg-slate-800 text-white px-12 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all border border-white/10 shadow-4xl group ${
                                            isEditingTemplate ? 'opacity-20 pointer-events-none' : ''
                                        }`}
                                    >
                                        Advance Protocol <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                    </button>
                                ) : !archiveUrl ? (
                                    <button 
                                        onClick={handleArchiveToSharePoint}
                                        disabled={isEditingTemplate || isArchiving}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all shadow-[0_0_50px_rgba(37,99,235,0.3)] flex items-center gap-4 disabled:opacity-50"
                                    >
                                        {isArchiving ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                                        {isArchiving ? 'GENERATING ARCHIVE...' : 'SAVE TO SHAREPOINT'}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-4 animate-in zoom-in duration-500">
                                        <a 
                                            href={archiveUrl} target="_blank" rel="noopener noreferrer"
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all shadow-4xl flex items-center gap-4"
                                        >
                                            <Share2 size={20} /> VIEW ON SHAREPOINT
                                        </a>
                                        <button 
                                            onClick={() => window.location.reload()}
                                            className="p-5 bg-slate-900 text-slate-500 hover:text-white rounded-[2rem] border border-white/5 transition-all shadow-2xl"
                                        >
                                            <RefreshCw size={24} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Global Insight Panel */}
                <div className="xl:col-span-3 flex flex-col gap-8">
                    <div className="bg-slate-900 border border-white/5 p-12 rounded-[4rem] shadow-4xl relative overflow-hidden group min-h-[350px] flex flex-col justify-center">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:rotate-12 transition-transform duration-700">
                            <Shield size={120} className="text-white" />
                        </div>
                        <div className="relative z-10 space-y-8">
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic border-l-4 border-blue-600 pl-6">Operations</h3>
                            <div className="space-y-6">
                                {[
                                    { icon: Key, title: 'Identity Audit', status: 'Comprehensive', color: 'text-emerald-500' },
                                    { icon: ListChecks, title: 'SharePoint Archival', status: 'v1.0.4', color: 'text-blue-500' },
                                    { icon: Layout, title: 'Master Protocol', status: `${template.length} Requirements`, color: 'text-slate-500' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-5 bg-black/30 p-5 rounded-3xl border border-white/10 group/item hover:bg-black/50 transition-all">
                                        <item.icon size={20} className="text-slate-700 group-hover/item:text-blue-500 transition-colors" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-3 mb-1.5">{item.title}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${item.color}`}>{item.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-12 rounded-[4rem] shadow-5xl group relative overflow-hidden flex-1 flex flex-col justify-center text-center">
                        <Zap size={140} className="absolute -bottom-10 -left-10 text-white/10 group-hover:rotate-45 transition-transform duration-1000" />
                        <div className="relative z-10 space-y-6">
                            <h3 className="text-5xl font-black text-white uppercase tracking-tighter italic drop-shadow-2xl">Vault</h3>
                            <p className="text-blue-100 text-sm font-bold leading-relaxed px-6 underline decoration-white/20 underline-offset-8">
                                Audit logs are instantly synchronized with the enterprise vault for compliance archival.
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-20">
                            <RefreshCw size={40} className="animate-spin-slow text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
                .animate-spin-slow { animation: spin 8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .shadow-4xl { box-shadow: 0 25px 80px -20px rgba(0, 0, 0, 0.7); }
                .shadow-5xl { box-shadow: 0 35px 100px -25px rgba(37, 99, 235, 0.4); }
            `}</style>
        </div>
    );
}
