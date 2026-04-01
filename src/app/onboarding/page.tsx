'use client';

import { useState, useEffect } from 'react';
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
    ChevronDown,
    ChevronUp,
    AppWindow,
    Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
    { id: 1, title: 'Identity', icon: UserCircle, description: 'Profile' },
    { id: 2, title: 'Groups', icon: Users, description: 'Memberships' },
    { id: 3, title: 'Licensing', icon: CreditCard, description: 'M365 Access' },
    { id: 4, title: 'Checklist', icon: ListChecks, description: 'Setup Tasks' },
    { id: 5, title: 'Provision', icon: Zap, description: 'Final Sync' }
];

const REGIONS = ['Southern', 'Western', 'Northern', 'Eastern', 'Head Office'];

const OnboardingInput = ({ label, icon: Icon, value, onChange, placeholder, type = "text" }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
        <div className="relative group">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
                type={type} value={value} 
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder} 
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-600 transition-all font-medium text-sm"
            />
        </div>
    </div>
);

export default function OnboardingWizard() {
    const [step, setStep] = useState(1);
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);
    const [template, setTemplate] = useState<any[]>([]);
    const [loadingTemplate, setLoadingTemplate] = useState(true);
    const [savingTemplate, setSavingTemplate] = useState(false);

    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [groupSearch, setGroupSearch] = useState('');

    const [loadingSkus, setLoadingSkus] = useState(false);
    const [availableSkus, setAvailableSkus] = useState<any[]>([]);

    const [provisioning, setProvisioning] = useState(false);
    const [provisionResult, setProvisionResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        displayName: '',
        givenName: '',
        surname: '',
        userPrincipalName: '',
        jobTitle: '',
        companyName: 'Equinox Group Holdings, Inc.',
        department: '',
        officeLocation: 'Head Office',
        mobilePhone: '',
        businessPhones: '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'South Africa',
        tempPassword: `Eqn!${Math.floor(100000 + Math.random() * 900000)}`,
        licenseSkus: [] as string[],
        groupIds: [] as string[],
        checklist: {} as Record<string, boolean>
    });

    // Initial Load: Checklist Template
    useEffect(() => {
        fetch('/api/onboarding/template')
            .then(res => res.json())
            .then(data => {
                setTemplate(data.template || []);
                // Initialize form checklist state from template
                const initialChecklist: Record<string, boolean> = {};
                (data.template || []).forEach((item: any) => {
                    initialChecklist[item.id] = item.checked || false;
                });
                setFormData(prev => ({ ...prev, checklist: initialChecklist }));
                setLoadingTemplate(false);
            })
            .catch(() => setLoadingTemplate(false));
    }, []);

    // Step 2: Fetch Groups
    useEffect(() => {
        if (step === 2 && availableGroups.length === 0) {
            setLoadingGroups(true);
            fetch('/api/groups')
                .then(res => res.json())
                .then(data => {
                    setAvailableGroups(data.groups || []);
                    setLoadingGroups(false);
                })
                .catch(() => setLoadingGroups(false));
        }
    }, [step]);

    // Step 3: Fetch Licenses
    useEffect(() => {
        if (step === 3 && availableSkus.length === 0) {
            setLoadingSkus(true);
            fetch('/api/onboarding/skus')
                .then(res => res.json())
                .then(data => {
                    setAvailableSkus(data.skus || []);
                    setLoadingSkus(false);
                })
                .catch(() => setLoadingSkus(false));
        }
    }, [step]);

    const handleNext = () => setStep(s => Math.min(s + 1, 5));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const toggleGroup = (groupId: string) => {
        setFormData(prev => ({
            ...prev,
            groupIds: prev.groupIds.includes(groupId) 
                ? prev.groupIds.filter(id => id !== groupId)
                : [...prev.groupIds, groupId]
        }));
    };

    const toggleLicense = (skuId: string) => {
        setFormData(prev => ({
            ...prev,
            licenseSkus: prev.licenseSkus.includes(skuId) 
                ? prev.licenseSkus.filter(id => id !== skuId)
                : [...prev.licenseSkus, skuId]
        }));
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

    const handleProvision = async () => {
        setProvisioning(true);
        setError(null);
        try {
            const res = await fetch('/api/onboarding/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    mailNickname: formData.userPrincipalName.split('@')[0],
                    password: formData.tempPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                setProvisionResult(data);
                setStep(6); // Success state
            } else {
                setError(data.error || "Provisioning failed.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProvisioning(false);
        }
    };

    const categories = ['General', 'Enrollment', 'Applications', 'Configuration'];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 backdrop-blur-3xl shadow-2xl relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                    <Zap size={140} className="text-blue-500" />
                </div>

                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
                        Digital <span className="text-blue-500">Onboarding</span>
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight max-w-md italic">Master provisioning workflow with persistent checklist management.</p>
                </div>
                
                {/* Progress Indicators */}
                <div className="flex items-center gap-2 relative z-10">
                    {STEPS.map(s => (
                        <div key={s.id} className="flex items-center">
                            <div className={`w-12 h-12 rounded-[1.25rem] flex flex-col items-center justify-center transition-all group relative ${
                                step >= s.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'bg-slate-950/50 text-slate-700 border border-slate-800'
                            }`}>
                                <s.icon size={20} />
                                <div className="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                    <div className="bg-slate-800 text-[10px] font-black uppercase px-2 py-1 rounded text-white tracking-widest">{s.title}</div>
                                </div>
                            </div>
                            {s.id < 5 && <div className={`w-6 h-1 transition-all ${step > s.id ? 'bg-blue-600' : 'bg-slate-900 opacity-20'}`} />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Wizard Card */}
                <div className="xl:col-span-9 bg-slate-900/50 backdrop-blur-2xl border border-white/5 rounded-[3rem] shadow-3xl relative overflow-hidden flex flex-col">
                    
                    {/* Template Editor Toggle */}
                    {step === 4 && (
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
                            {/* Step 1: Identity & Profile */}
                            {step === 1 && (
                                <motion.div 
                                    key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Identity Profile</h2>
                                        <p className="text-slate-500 font-medium italic">Synchronizing 15+ standard profile fields with Entra ID.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        <div className="space-y-6">
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4">Core Identity</h3>
                                            <OnboardingInput label="Full Display Name" icon={UserCircle} value={formData.displayName} onChange={(v:any) => setFormData({...formData, displayName: v})} placeholder="e.g. Johnathan Smith" />
                                            <OnboardingInput label="Work Email (UPN)" icon={Mail} value={formData.userPrincipalName} onChange={(v:any) => setFormData({...formData, userPrincipalName: v})} placeholder="john.smith@domain.com" />
                                            <OnboardingInput label="First Name" icon={UserCircle} value={formData.givenName} onChange={(v:any) => setFormData({...formData, givenName: v})} placeholder="Johnathan" />
                                            <OnboardingInput label="Last Name" icon={UserCircle} value={formData.surname} onChange={(v:any) => setFormData({...formData, surname: v})} placeholder="Smith" />
                                        </div>
                                        <div className="space-y-6">
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-4">Role & Location</h3>
                                            <OnboardingInput label="Job Title" icon={Zap} value={formData.jobTitle} onChange={(v:any) => setFormData({...formData, jobTitle: v})} placeholder="Senior Administrator" />
                                            <OnboardingInput label="Department" icon={Building2} value={formData.department} onChange={(v:any) => setFormData({...formData, department: v})} placeholder="Engineering" />
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Office Location</label>
                                                <select 
                                                    value={formData.officeLocation} 
                                                    onChange={e => setFormData({...formData, officeLocation: e.target.value})}
                                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:border-blue-600 transition-all font-medium text-sm appearance-none"
                                                >
                                                    {REGIONS.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                                                </select>
                                            </div>
                                            <OnboardingInput label="Business Phone" icon={Phone} value={formData.businessPhones} onChange={(v:any) => setFormData({...formData, businessPhones: v})} placeholder="+27 11 000 0000" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 2: Group Assignment */}
                            {step === 2 && (
                                <motion.div 
                                    key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Security Groups</h2>
                                        <p className="text-slate-500 font-medium italic">Assigning memberships in Microsoft Entra Security Groups.</p>
                                    </div>

                                    <div className="relative group mb-4">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                        <input 
                                            type="text" value={groupSearch} onChange={e => setGroupSearch(e.target.value)}
                                            placeholder="Search Intune, Engineering, Default Groups..."
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-600 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                                        {loadingGroups ? (
                                            <div className="col-span-full py-20 flex flex-col items-center">
                                                <Loader2 size={32} className="animate-spin text-blue-500" />
                                                <p className="text-xs font-mono uppercase text-slate-500 tracking-widest mt-4">Consulting Directory Operations...</p>
                                            </div>
                                        ) : availableGroups.filter(g => g.displayName.toLowerCase().includes(groupSearch.toLowerCase())).map(group => (
                                            <div 
                                                key={group.id} onClick={() => toggleGroup(group.id)}
                                                className={`p-5 rounded-[2rem] border transition-all cursor-pointer group ${
                                                    formData.groupIds.includes(group.id) ? 'bg-blue-600/10 border-blue-600 shadow-xl' : 'bg-slate-950/20 border-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                                        formData.groupIds.includes(group.id) ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-600 border border-slate-800'
                                                    }`}>
                                                        <Shield size={18} />
                                                    </div>
                                                    <div className="text-left flex-1 min-w-0">
                                                        <div className="text-sm font-bold text-white truncate uppercase tracking-tight">{group.displayName}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono truncate">{group.id.split('-')[0]}...</div>
                                                    </div>
                                                    {formData.groupIds.includes(group.id) && <CheckCircle2 className="text-blue-500" size={20} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: Licensing */}
                            {step === 3 && (
                                <motion.div 
                                    key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Access & Licensing</h2>
                                        <p className="text-slate-500 font-medium italic">Targeting Microsoft 365 cloud service units.</p>
                                    </div>

                                    {loadingSkus ? (
                                        <div className="py-20 flex flex-col items-center">
                                            <Loader2 size={32} className="animate-spin text-blue-500" />
                                            <p className="text-xs font-mono uppercase text-slate-500 tracking-widest mt-4">Consulting SKU Subscriptions...</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {availableSkus.map(sku => (
                                                <div 
                                                    key={sku.skuId} onClick={() => toggleLicense(sku.skuId)}
                                                    className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${
                                                        formData.licenseSkus.includes(sku.skuId) ? 'bg-emerald-600/10 border-emerald-600 shadow-xl' : 'bg-slate-950/20 border-slate-800'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                                                formData.licenseSkus.includes(sku.skuId) ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-600'
                                                            }`}>
                                                                <CreditCard size={20} />
                                                            </div>
                                                            <div className="text-left font-black uppercase tracking-tight">
                                                                <div className="text-sm text-white">{sku.skuPartNumber.replace(/_/g, ' ')}</div>
                                                                <div className="text-[10px] text-slate-500 tracking-widest italic">{sku.prepaidUnits.enabled - sku.consumedUnits} Available</div>
                                                            </div>
                                                        </div>
                                                        {formData.licenseSkus.includes(sku.skuId) && <CheckCircle2 className="text-emerald-500" size={24} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Step 4: The Master Checklist (Dynamic) */}
                            {step === 4 && (
                                <motion.div 
                                    key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10 h-full"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Operational Checklist</h2>
                                        <p className="text-slate-500 font-medium italic">Standardized workflow items for the Equipment & Config phase.</p>
                                    </div>

                                    {loadingTemplate ? (
                                         <div className="py-20 flex flex-col items-center">
                                            <Loader2 size={32} className="animate-spin text-blue-500" />
                                            <p className="text-xs font-mono uppercase text-slate-500 tracking-widest mt-4">Syncing Supabase Template...</p>
                                         </div>
                                    ) : isEditingTemplate ? (
                                        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-300">
                                            {categories.map(cat => (
                                                <div key={cat} className="space-y-4">
                                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.4em]">{cat} Phase</h3>
                                                        <button 
                                                            onClick={() => setTemplate([...template, { id: Math.random().toString(36).substr(2, 9), category: cat, title: 'New Task', detail: 'Done', checked: true }])}
                                                            className="p-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {template.filter(t => t.category === cat).map((item, idx) => (
                                                            <div key={item.id} className="flex items-center gap-4 bg-slate-950/20 p-2 rounded-2xl border border-white/5 group">
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
                                                                    placeholder="Detail"
                                                                    className="w-32 bg-slate-900/50 border border-white/5 rounded-lg py-1 px-3 text-[10px] text-slate-400 focus:outline-none"
                                                                />
                                                                <button 
                                                                    onClick={() => setTemplate(template.filter(i => i.id !== item.id))}
                                                                    className="p-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={handleSaveTemplate}
                                                disabled={savingTemplate}
                                                className="w-full bg-blue-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-colors hover:bg-blue-500"
                                            >
                                                {savingTemplate ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                                Commit Template Changes
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-10 max-h-[500px] overflow-y-auto custom-scrollbar pr-6">
                                            {categories.map(cat => (
                                                <div key={cat} className="space-y-4">
                                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] ml-1">{cat} Status</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {template.filter(t => t.category === cat).map(item => {
                                                            const isChecked = formData.checklist[item.id];
                                                            return (
                                                                <div 
                                                                    key={item.id}
                                                                    onClick={() => setFormData({...formData, checklist: {...formData.checklist, [item.id]: !isChecked}})}
                                                                    className={`p-4 rounded-[1.5rem] border transition-all cursor-pointer flex items-center justify-between group ${
                                                                        isChecked ? 'bg-blue-600/5 border-blue-600/30' : 'bg-slate-950/20 border-white/5'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                                                            isChecked ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-700'
                                                                        }`}>
                                                                            <CheckCircle2 size={16} />
                                                                        </div>
                                                                        <div className="text-left font-bold text-[13px] tracking-tight uppercase leading-none">
                                                                            <div className={isChecked ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>{item.title}</div>
                                                                            {item.detail && <div className="text-[10px] text-blue-500/50 mt-1 italic font-medium">{item.detail}</div>}
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

                            {/* Step 5: Provision Summary */}
                            {step === 5 && (
                                <motion.div 
                                    key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter text-center">Provisioning Review</h2>
                                        <p className="text-slate-500 font-medium italic text-center">Finalizing digital identity and asset footprint.</p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="bg-slate-950/50 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                                            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-white/5 pb-4">Identity Signature</h3>
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center font-black text-2xl uppercase italic border border-blue-600/30">
                                                    {formData.displayName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-black text-white uppercase tracking-tighter">{formData.displayName}</div>
                                                    <div className="text-xs font-mono text-slate-500 lowercase select-all">{formData.userPrincipalName}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6 pt-4">
                                                <div>
                                                    <div className="text-[10px] text-slate-600 font-black uppercase mb-1">Assigned Licenses</div>
                                                    <div className="text-sm text-white font-bold">{formData.licenseSkus.length} Active SKUs</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-600 font-black uppercase mb-1">Group Overlays</div>
                                                    <div className="text-sm text-white font-bold">{formData.groupIds.length} Direct Memberships</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-600 font-black uppercase mb-1">Temporary PIN</div>
                                                    <div className="text-sm text-emerald-500 font-mono font-black select-all tracking-wider">{formData.tempPassword}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-600 font-black uppercase mb-1">Location</div>
                                                    <div className="text-sm text-white font-bold uppercase tracking-tight">{formData.officeLocation}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-950/50 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                                            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest border-b border-white/5 pb-4">Checklist Compliance</h3>
                                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-4 custom-scrollbar">
                                                {template.map(t => (
                                                    <div key={t.id} className="flex items-center justify-between gap-4 py-1 text-[11px] font-bold border-b border-white/5">
                                                        <span className={formData.checklist[t.id] ? 'text-slate-300' : 'text-slate-700 italic'}>{t.title}</span>
                                                        {formData.checklist[t.id] ? <CheckCircle2 className="text-emerald-500" size={14} /> : <AlertCircle className="text-slate-800" size={14} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-6 bg-rose-600/10 border border-rose-500/30 rounded-3xl flex items-center gap-4 animate-shake">
                                            <div className="p-3 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-600/20">
                                                <AlertCircle size={20} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] mb-1">Directory Error Sync</div>
                                                <div className="text-sm text-slate-300 font-medium">{error}</div>
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleProvision}
                                        disabled={provisioning || !formData.displayName || !formData.userPrincipalName}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white font-black uppercase text-xs tracking-[0.3em] py-8 rounded-[2rem] transition-all shadow-3xl shadow-blue-600/30 flex items-center justify-center gap-4 group"
                                    >
                                        {provisioning ? <Loader2 className="animate-spin" size={24} /> : <Zap size={24} fill="currentColor" />}
                                        {provisioning ? 'FINALIZING ENTRA ID DEPLOYMENT...' : 'EXECUTE PROVISIONING SEQUENCE'}
                                    </button>
                                </motion.div>
                            )}

                            {/* Step 6: Full Success State */}
                            {step === 6 && (
                                <motion.div 
                                    key="step6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 flex flex-col items-center space-y-10"
                                >
                                    <div className="w-32 h-32 bg-emerald-500/10 rounded-[3rem] flex items-center justify-center text-emerald-500 shadow-[0_0_100px_rgba(16,185,129,0.1)] border border-emerald-500/20 animate-pulse relative">
                                        <div className="absolute inset-0 bg-emerald-500/20 rounded-[3rem] blur-3xl" />
                                        <CheckCircle2 size={64} className="relative z-10" />
                                    </div>
                                    <div className="text-center space-y-3">
                                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter">Identity Live</h2>
                                        <p className="text-slate-500 font-medium italic text-lg">New employee provisioned with full profile & group clusters.</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl text-left">
                                        <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                                            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 text-center border-b border-white/5 pb-4 mb-4">M365 Provisioning Log</div>
                                            <div className="space-y-4 font-mono text-[11px] font-bold">
                                                <div className="flex justify-between items-center text-slate-500 uppercase tracking-tighter">
                                                    <span>Entra ID Object</span>
                                                    <span className="text-blue-500 truncate ml-4">{provisionResult?.userId}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-500 uppercase tracking-tighter">
                                                    <span>License SKU Sync</span>
                                                    <span className="text-emerald-500 italic">Confirmed (v1.0)</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-500 uppercase tracking-tighter">
                                                    <span>Group Injection</span>
                                                    <span className="text-emerald-500 italic">Succeeded</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-center">
                                            <Key size={80} className="absolute top-0 right-0 p-4 opacity-10" />
                                            <div className="relative z-10 space-y-2">
                                                <div className="text-[10px] font-black text-blue-100 uppercase tracking-tighter italic">Handover Credential</div>
                                                <div className="text-4xl font-black text-white font-mono tracking-wider select-all">{formData.tempPassword}</div>
                                                <p className="text-blue-200 text-[10px] font-bold uppercase leading-tight">Must be changed upon initial MFA registration.</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => window.location.reload()}
                                        className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 hover:text-blue-400 transition-all py-4 px-10 rounded-2xl border border-white/5 hover:border-blue-400/30"
                                    >
                                        Execute New Onboarding Flow
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Desktop Navigation Control Bar */}
                    {step < 5 && (
                        <div className="border-t border-white/5 p-10 flex justify-between items-center bg-slate-950/20 backdrop-blur-3xl shrink-0">
                            <button 
                                onClick={handleBack}
                                disabled={step === 1 || isEditingTemplate}
                                className={`flex items-center gap-3 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    step === 1 || isEditingTemplate ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:text-blue-400 border border-transparent hover:border-blue-400/20'
                                }`}
                            >
                                <ArrowLeft size={16} /> Back Sequence
                            </button>
                            {step < 5 && (
                                <button 
                                    onClick={handleNext}
                                    disabled={isEditingTemplate}
                                    className={`flex items-center gap-4 bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 shadow-2xl ${
                                        isEditingTemplate ? 'opacity-20 pointer-events-none' : ''
                                    }`}
                                >
                                    Proceed <ArrowRight size={18} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Sidebar: Dynamic Context Panel */}
                <div className="xl:col-span-3 flex flex-col gap-8">
                    <div className="bg-blue-600 p-10 rounded-[3rem] shadow-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                            <Shield size={80} className="text-white" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Policy Ops</h3>
                            <p className="text-blue-100 text-sm font-medium leading-relaxed">
                                Deploying with <span className="underline decoration-wavy">Baseline Security</span> protocols.
                            </p>
                            <div className="space-y-4">
                                {[
                                    { icon: Key, title: 'Identity Protection', desc: 'MFA Required' },
                                    { icon: ListChecks, title: 'Compliance Check', desc: 'Active' },
                                    { icon: AppWindow, title: 'App Deployment', desc: 'Dynamic List' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-black/10 p-4 rounded-2xl border border-white/5">
                                        <item.icon size={18} className="text-blue-200" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-white uppercase tracking-tight leading-3 mb-1">{item.title}</span>
                                            <span className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">{item.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl flex-1 flex flex-col">
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
                             <Layout size={20} className="text-slate-700" />
                             Environment
                        </h3>
                        <div className="space-y-8 flex-1">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em]">Graph API</div>
                                <div className="text-[11px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live
                                </div>
                            </div>
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em]">Supabase KV</div>
                                <div className="text-[11px] text-blue-500 font-black uppercase tracking-widest">Active</div>
                            </div>
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em]">Sync Latency</div>
                                <div className="text-[11px] text-slate-300 font-bold"><span className="text-xs italic">~2.4s</span></div>
                            </div>
                        </div>
                        
                        <div className="mt-auto pt-6 border-t border-white/5">
                            <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">
                                Version: B-2026.04.01-EXP
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
                input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1); }
                select {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 1.5rem center;
                    background-size: 1.25rem;
                }
            `}</style>
        </div>
    );
}
