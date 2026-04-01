'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    UserPlus, 
    Shield, 
    ListChecks, 
    Zap, 
    ArrowRight, 
    ArrowLeft, 
    CheckCircle2, 
    Loader2, 
    Settings,
    HardDrive,
    Mail,
    UserCircle,
    Building2,
    MapPin,
    CreditCard,
    Key,
    AlertCircle,
    Phone,
    Globe,
    Home,
    Plus,
    Trash2,
    Save,
    Search,
    Users,
    Layout,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
    { id: 1, title: 'Selection', icon: Search, description: 'Select User' },
    { id: 2, title: 'Profile', icon: UserCircle, description: 'Audit Info' },
    { id: 3, title: 'Groups', icon: Users, description: 'Memberships' },
    { id: 4, title: 'Licensing', icon: CreditCard, description: 'M365 Access' },
    { id: 5, title: 'Checklist', icon: ListChecks, description: 'Setup Status' }
];

const OnboardingInput = ({ label, icon: Icon, value, onChange, placeholder, readOnly = false }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
        <div className="relative group">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
                type="text" value={value} 
                onChange={e => !readOnly && onChange(e.target.value)}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`w-full bg-slate-950/50 border ${readOnly ? 'border-slate-900 text-slate-500' : 'border-slate-800 text-white focus:border-blue-600'} rounded-2xl py-3.5 pl-12 pr-4 transition-all font-medium text-sm`}
            />
        </div>
    </div>
);

export default function OnboardingAuditWizard() {
    const [step, setStep] = useState(1);
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);
    
    // Master Template (loaded from Supabase api/onboarding/template)
    const [template, setTemplate] = useState<any[]>([]);
    const [loadingTemplate, setLoadingTemplate] = useState(true);
    const [savingTemplate, setSavingTemplate] = useState(false);

    // User Search & Selection
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // Entra Data Fetching
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [loadingSkus, setLoadingSkus] = useState(false);
    const [availableSkus, setAvailableSkus] = useState<any[]>([]);

    // Per-User Checklist State
    const [userChecklist, setUserChecklist] = useState<Record<string, boolean>>({});
    const [loadingUserChecklist, setLoadingUserChecklist] = useState(false);
    const [savingUserChecklist, setSavingUserChecklist] = useState(false);

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
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoadingUsers(false);
            }
        };

        const timer = setTimeout(fetchUsers, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Handle User Selection
    const handleSelectUser = async (user: any) => {
        setSelectedUser(user);
        setStep(2);
        
        // Load user-specific checklist from Supabase
        setLoadingUserChecklist(true);
        try {
            const res = await fetch(`/api/onboarding/checklist/${user.id}`);
            const data = await res.json();
            setUserChecklist(data.checklist || {});
        } catch (err) {
            console.error("Failed to load user checklist", err);
        } finally {
            setLoadingUserChecklist(false);
        }

        // Pre-fetch Groups & Skus
        fetch('/api/groups').then(res => res.json()).then(data => setAvailableGroups(data.groups || []));
        fetch('/api/onboarding/skus').then(res => res.json()).then(data => setAvailableSkus(data.skus || []));
    };

    const handleNext = () => setStep(s => Math.min(s + 1, 5));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const toggleChecklistItem = async (id: string) => {
        const next = { ...userChecklist, [id]: !userChecklist[id] };
        setUserChecklist(next);
        
        // Auto-save to Supabase
        setSavingUserChecklist(true);
        try {
            await fetch(`/api/onboarding/checklist/${selectedUser.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checklist: next })
            });
        } catch (err) {
            console.error("Failed to save checklist item", err);
        } finally {
            setSavingUserChecklist(false);
        }
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
        } catch (err) {
            console.error("Failed to save template", err);
        } finally {
            setSavingTemplate(false);
        }
    };

    const categories = ['General', 'Enrollment', 'Applications', 'Configuration'];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 backdrop-blur-3xl shadow-2xl relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                    <ListChecks size={140} className="text-blue-500" />
                </div>

                <div className="relative z-10 space-y-1">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                        Setup <span className="text-blue-500">& Audit</span>
                    </h1>
                    {selectedUser ? (
                        <div className="flex items-center gap-3 bg-blue-600/10 px-4 py-2 rounded-2xl border border-blue-500/20">
                            <UserCircle size={18} className="text-blue-500" />
                            <span className="text-white font-black uppercase text-xs tracking-widest">{selectedUser.displayName}</span>
                        </div>
                    ) : (
                        <p className="text-slate-500 font-medium tracking-tight italic">Manage and track employee readiness / asset distribution.</p>
                    )}
                </div>
                
                {/* Progress Indicators */}
                <div className="flex items-center gap-2 relative z-10">
                    {STEPS.map(s => (
                        <div key={s.id} className="flex items-center">
                            <div className={`w-12 h-12 rounded-[1.25rem] flex flex-col items-center justify-center transition-all group relative ${
                                step >= s.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'bg-slate-950/50 text-slate-700 border border-slate-800'
                            }`}>
                                <s.icon size={20} />
                            </div>
                            {s.id < 5 && <div className={`w-6 h-1 transition-all ${step > s.id ? 'bg-blue-600' : 'bg-slate-900 opacity-20'}`} />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Wizard Card */}
                <div className="xl:col-span-9 bg-slate-900/50 backdrop-blur-2xl border border-white/5 rounded-[3rem] shadow-3xl relative overflow-hidden flex flex-col min-h-[600px]">
                    
                    {/* Template Editor Toggle */}
                    {step === 5 && (
                        <div className="absolute top-8 right-8 z-20">
                            <button 
                                onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isEditingTemplate ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                                }`}
                            >
                                <Settings size={14} className={isEditingTemplate ? 'animate-spin' : ''} />
                                {isEditingTemplate ? 'EXIT EDITOR' : 'ORGANIZE TEMPLATE'}
                            </button>
                        </div>
                    )}

                    <div className="p-12 relative z-10 flex-1">
                        <AnimatePresence mode="wait">
                            {/* Step 1: User Audit Selection */}
                            {step === 1 && (
                                <motion.div 
                                    key="step1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                    className="space-y-8"
                                >
                                    <div className="text-center space-y-4 max-w-lg mx-auto">
                                        <div className="w-20 h-20 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-blue-500 shadow-2xl shadow-blue-600/10 border border-blue-600/20">
                                            <Search size={40} />
                                        </div>
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Find Employee</h2>
                                        <p className="text-slate-500 text-sm font-medium italic">Select an existing user from Microsoft Entra ID to link and manage their setup checklist.</p>
                                    </div>

                                    <div className="relative group max-w-2xl mx-auto">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={24} />
                                        <input 
                                            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Search by Name or Email..."
                                            className="w-full bg-slate-950 border border-slate-800 rounded-[2rem] py-6 pl-16 pr-8 text-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-600 transition-all font-bold"
                                        />
                                        {loadingUsers && (
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                <Loader2 className="animate-spin text-blue-600" size={24} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                                        {users.map(u => (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                key={u.id} onClick={() => handleSelectUser(u)}
                                                className="p-6 bg-slate-950/40 border border-slate-800 rounded-[2rem] hover:border-blue-600/50 hover:bg-blue-600/5 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600 font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                        {u.displayName.charAt(0)}
                                                    </div>
                                                    <div className="text-left flex-1 min-w-0">
                                                        <div className="text-sm font-black text-white uppercase tracking-tight truncate">{u.displayName}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono truncate lowercase">{u.userPrincipalName}</div>
                                                    </div>
                                                    <ArrowRight size={18} className="text-slate-700 group-hover:text-blue-500 transition-all" />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 2: Information Audit */}
                            {step === 2 && (
                                <motion.div 
                                    key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Profile Audit</h2>
                                        <p className="text-slate-500 font-medium italic">Verifying standard identity fields from Microsoft Entra ID.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        <div className="space-y-6">
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4">Live Values</h3>
                                            <OnboardingInput label="Display Name" icon={UserCircle} value={selectedUser?.displayName} readOnly />
                                            <OnboardingInput label="Job Title" icon={Zap} value={selectedUser?.jobTitle || 'Unset'} readOnly />
                                            <OnboardingInput label="Department" icon={Building2} value={selectedUser?.department || 'Unset'} readOnly />
                                        </div>
                                        <div className="space-y-6">
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4">Location & Org</h3>
                                            <OnboardingInput label="Office Location" icon={MapPin} value={selectedUser?.officeLocation || 'Unset'} readOnly />
                                            <OnboardingInput label="Tenant Email" icon={Mail} value={selectedUser?.userPrincipalName} readOnly />
                                            <OnboardingInput label="Object ID" icon={Key} value={selectedUser?.id} readOnly />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: Groups Audit */}
                            {step === 3 && (
                                <motion.div 
                                    key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-1 text-center">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Group Memberships</h2>
                                        <p className="text-slate-500 font-medium italic">Current clusters this user belongs to in Entra ID.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                                        {availableGroups.map(group => (
                                            <div 
                                                key={group.id}
                                                className={`p-5 rounded-[2rem] border transition-all ${
                                                    selectedUser?.memberOf?.some((m: any) => m.id === group.id) ? 'bg-blue-600/10 border-blue-600' : 'bg-slate-950/20 border-slate-900 opacity-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                        selectedUser?.memberOf?.some((m: any) => m.id === group.id) ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-800'
                                                    }`}>
                                                        <Users size={18} />
                                                    </div>
                                                    <div className="text-left flex-1 min-w-0">
                                                        <div className="text-[11px] font-black text-white uppercase tracking-tight truncate">{group.displayName}</div>
                                                        <div className="text-[9px] text-slate-600 font-mono truncate">{group.id}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">Note: Groups can only be viewed in Audit Mode.</p>
                                </motion.div>
                            )}

                            {/* Step 4: Licensing Audit */}
                            {step === 4 && (
                                <motion.div 
                                    key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-1 text-center">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Cloud Subscriptions</h2>
                                        <p className="text-slate-500 font-medium italic">Active M365 SKUs assigned to the user entity.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableSkus.map(sku => {
                                            const hasLicense = selectedUser?.assignedLicenses?.some((l: any) => l.skuId === sku.skuId);
                                            return (
                                                <div 
                                                    key={sku.skuId}
                                                    className={`p-6 rounded-[2rem] border transition-all ${
                                                        hasLicense ? 'bg-emerald-600/10 border-emerald-600 shadow-xl shadow-emerald-500/5' : 'bg-slate-950/20 border-slate-900 opacity-40'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                                                hasLicense ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-800'
                                                            }`}>
                                                                <CreditCard size={20} />
                                                            </div>
                                                            <div className="text-left font-black uppercase tracking-tight">
                                                                <div className="text-sm text-white">{sku.skuPartNumber.replace(/_/g, ' ')}</div>
                                                                <div className={hasLicense ? 'text-emerald-500 text-[10px]' : 'text-slate-700 text-[10px]'}>
                                                                    {hasLicense ? 'Active' : 'Unassigned'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {hasLicense && <CheckCircle2 className="text-emerald-500" size={24} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 5: The Master Checklist (Per-User Persistence) */}
                            {step === 5 && (
                                <motion.div 
                                    key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Setup Readiness</h2>
                                        <p className="text-slate-500 font-medium italic">30+ Point Audit Checklist for {selectedUser?.displayName}.</p>
                                    </div>

                                    {loadingTemplate || loadingUserChecklist ? (
                                         <div className="py-20 flex flex-col items-center">
                                            <Loader2 size={32} className="animate-spin text-blue-500" />
                                            <p className="text-xs font-mono uppercase text-slate-500 tracking-widest mt-4">Syncing Supabase Audit Logs...</p>
                                         </div>
                                    ) : isEditingTemplate ? (
                                        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-300">
                                            <div className="p-6 bg-emerald-600/10 border border-emerald-600/30 rounded-3xl mb-8">
                                                <h3 className="text-emerald-500 font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
                                                    <Settings size={16} /> Template Management
                                                </h3>
                                                <p className="text-slate-400 text-xs italic font-medium leading-relaxed">Changes made here will update the "Master List" for all future audits across the enterprise.</p>
                                            </div>
                                            {categories.map(cat => (
                                                <div key={cat} className="space-y-4">
                                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.4em]">{cat} Phase</h3>
                                                        <button 
                                                            onClick={() => setTemplate([...template, { id: Math.random().toString(36).substr(2, 9), category: cat, title: 'New Requirement', detail: 'Pending', checked: false }])}
                                                            className="p-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {template.filter(t => t.category === cat).map((item) => (
                                                            <div key={item.id} className="flex items-center gap-4 bg-slate-950/40 p-2 rounded-2xl border border-white/5 group">
                                                                <input 
                                                                    type="text" value={item.title} 
                                                                    onChange={e => {
                                                                        const next = [...template];
                                                                        next.find(i => i.id === item.id).title = e.target.value;
                                                                        setTemplate(next);
                                                                    }}
                                                                    className="flex-1 bg-transparent border-none text-white text-sm font-bold focus:ring-0 px-4"
                                                                />
                                                                <input 
                                                                    type="text" value={item.detail || ''} 
                                                                    onChange={e => {
                                                                        const next = [...template];
                                                                        next.find(i => i.id === item.id).detail = e.target.value;
                                                                        setTemplate(next);
                                                                    }}
                                                                    className="w-32 bg-slate-900/50 border border-white/5 rounded-lg py-1 px-3 text-[10px] text-slate-400 focus:outline-none"
                                                                />
                                                                <button onClick={() => setTemplate(template.filter(i => i.id !== item.id))} className="p-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={handleSaveTemplate} disabled={savingTemplate}
                                                className="w-full bg-blue-600 py-6 rounded-3xl font-black text-xs uppercase tracking-widest text-white shadow-3xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-colors hover:bg-blue-500"
                                            >
                                                {savingTemplate ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                                Commit Global Protocol Updates
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-10 max-h-[500px] overflow-y-auto custom-scrollbar pr-6">
                                            {categories.map(cat => (
                                                <div key={cat} className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] ml-1">{cat} Status</h3>
                                                        <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest">
                                                            {template.filter(t => t.category === cat && userChecklist[t.id]).length}/{template.filter(t => t.category === cat).length} Complete
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {template.filter(t => t.category === cat).map(item => {
                                                            const isChecked = !!userChecklist[item.id];
                                                            return (
                                                                <div 
                                                                    key={item.id}
                                                                    onClick={() => toggleChecklistItem(item.id)}
                                                                    className={`p-4 rounded-[1.5rem] border transition-all cursor-pointer flex items-center justify-between group ${
                                                                        isChecked ? 'bg-emerald-600/10 border-emerald-600/40' : 'bg-slate-950/20 border-white/5'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                                                            isChecked ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-900 border border-slate-800 text-slate-700'
                                                                        }`}>
                                                                            {isChecked ? <CheckCircle2 size={16} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />}
                                                                        </div>
                                                                        <div className="text-left font-bold text-[12px] tracking-tight uppercase leading-none truncate overflow-hidden">
                                                                            <div className={isChecked ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>{item.title}</div>
                                                                            {item.detail && <div className="text-[9px] text-blue-500/50 mt-1 italic font-medium truncate">{item.detail}</div>}
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

                    {/* Desktop Navigation Control Bar */}
                    {step > 1 && (
                        <div className="border-t border-white/5 p-10 flex justify-between items-center bg-slate-950/40 backdrop-blur-3xl shrink-0 mt-auto">
                            <button 
                                onClick={handleBack}
                                disabled={isEditingTemplate}
                                className={`flex items-center gap-3 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isEditingTemplate ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:text-white border border-transparent hover:bg-slate-900'
                                }`}
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                            <div className="flex items-center gap-4">
                                {savingUserChecklist && (
                                    <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest mr-4">
                                        <RefreshCw size={14} className="animate-spin" />
                                        Syncing Audit...
                                    </div>
                                )}
                                {step < 5 ? (
                                    <button 
                                        onClick={handleNext}
                                        disabled={isEditingTemplate}
                                        className={`flex items-center gap-4 bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 shadow-2xl ${
                                            isEditingTemplate ? 'opacity-20 pointer-events-none' : ''
                                        }`}
                                    >
                                        Next <ArrowRight size={18} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => window.location.reload()}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-3xl shadow-blue-600/30"
                                    >
                                        Finish Audit Flow
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar: Dynamic Context Panel */}
                <div className="xl:col-span-3 flex flex-col gap-8">
                    <div className="bg-slate-900 border border-white/5 p-10 rounded-[3rem] shadow-3xl relative overflow-hidden group min-h-[300px]">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:rotate-12 transition-transform duration-500">
                            <Shield size={80} className="text-white" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Compliance</h3>
                            <div className="space-y-4">
                                {[
                                    { icon: Key, title: 'Identity Sync', status: 'Active', color: 'text-emerald-500' },
                                    { icon: ListChecks, title: 'Audit Trail', status: 'Persistent', color: 'text-blue-500' },
                                    { icon: Layout, title: 'Master List', status: `${template.length} Items`, color: 'text-slate-400' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                                        <item.icon size={18} className="text-slate-600" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-white uppercase tracking-tight leading-3 mb-1">{item.title}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${item.color}`}>{item.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600 p-10 rounded-[3rem] shadow-4xl group relative overflow-hidden flex-1 flex flex-col justify-center text-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700" />
                        <Zap size={100} className="absolute -bottom-10 -right-10 text-white/10 group-hover:rotate-45 transition-transform duration-700" />
                        <div className="relative z-10 space-y-4">
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">State</h3>
                            <p className="text-blue-100 text-sm font-medium leading-relaxed px-4 underline decoration-white/20">All checklist changes are saved instantly to your secure Supabase environment.</p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </div>
    );
}
