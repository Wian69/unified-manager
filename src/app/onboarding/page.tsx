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
    Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
    { id: 1, title: 'Identity', icon: UserCircle, description: 'Profile & Contact' },
    { id: 2, title: 'Licensing', icon: CreditCard, description: 'M365 Access' },
    { id: 3, title: 'Setup', icon: ListChecks, description: 'Tasks & Hardware' },
    { id: 4, title: 'Review', icon: Zap, description: 'Provisioning' }
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
    const [loadingSkus, setLoadingSkus] = useState(true);
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
        checklist: {
            laptopIssued: false,
            securityBadge: false,
            welcomeEmail: true,
            introMeeting: false
        }
    });

    // Fetch Licenses
    useEffect(() => {
        if (step === 2 && availableSkus.length === 0) {
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

    const handleNext = () => setStep(s => Math.min(s + 1, 4));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const toggleLicense = (skuId: string) => {
        setFormData(prev => ({
            ...prev,
            licenseSkus: prev.licenseSkus.includes(skuId) 
                ? prev.licenseSkus.filter(id => id !== skuId)
                : [...prev.licenseSkus, skuId]
        }));
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
                setStep(5); // Success state
            } else {
                setError(data.error || "Provisioning failed.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProvisioning(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
                        Digital <span className="text-blue-500">Onboarding</span>
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight">Provisioning new talent with full Entra ID profile synchronization.</p>
                </div>
                
                {/* Progress Indicators */}
                <div className="flex items-center gap-2">
                    {STEPS.map(s => (
                        <div key={s.id} className="flex items-center">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                                step >= s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 text-slate-600'
                            }`}>
                                <s.icon size={20} />
                            </div>
                            {s.id < 4 && <div className={`w-8 h-1 transition-all ${step > s.id ? 'bg-blue-600' : 'bg-slate-900 opacity-20'}`} />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Wizard Card */}
                <div className="xl:col-span-9 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <UserPlus size={120} className="text-white" />
                    </div>

                    <div className="p-10 relative z-10">
                        <AnimatePresence mode="wait">
                            {/* Step 1: Identity & Profile (EXPANDED) */}
                            {step === 1 && (
                                <motion.div 
                                    key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Identity & Profile</h2>
                                        <p className="text-slate-500 text-sm">Capture advanced Entra ID details for the new account.</p>
                                    </div>

                                    {/* SECTION: IDENTITY */}
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] border-b border-slate-800 pb-3">Identity</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                            <OnboardingInput label="Full Display Name" icon={UserCircle} value={formData.displayName} onChange={(v:any) => setFormData({...formData, displayName: v})} placeholder="e.g. Johnathan Smith" />
                                            <OnboardingInput label="Work Email (UPN)" icon={Mail} value={formData.userPrincipalName} onChange={(v:any) => setFormData({...formData, userPrincipalName: v})} placeholder="john.smith@domain.com" />
                                            <OnboardingInput label="First Name" icon={UserCircle} value={formData.givenName} onChange={(v:any) => setFormData({...formData, givenName: v})} placeholder="Johnathan" />
                                            <OnboardingInput label="Last Name" icon={UserCircle} value={formData.surname} onChange={(v:any) => setFormData({...formData, surname: v})} placeholder="Smith" />
                                        </div>
                                    </div>

                                    {/* SECTION: JOB INFORMATION */}
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] border-b border-slate-800 pb-3">Job Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                            <OnboardingInput label="Job Title" icon={Zap} value={formData.jobTitle} onChange={(v:any) => setFormData({...formData, jobTitle: v})} placeholder="Senior Systems Architect" />
                                            <OnboardingInput label="Company Name" icon={Globe} value={formData.companyName} onChange={(v:any) => setFormData({...formData, companyName: v})} placeholder="Equinox Group Holdings" />
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
                                        </div>
                                    </div>

                                    {/* SECTION: CONTACT & ADDRESS */}
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] border-b border-slate-800 pb-3">Contact & Address</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                            <OnboardingInput label="Mobile Phone" icon={Phone} value={formData.mobilePhone} onChange={(v:any) => setFormData({...formData, mobilePhone: v})} placeholder="+27 82 000 0000" />
                                            <OnboardingInput label="Business Phone" icon={Phone} value={formData.businessPhones} onChange={(v:any) => setFormData({...formData, businessPhones: v})} placeholder="+27 11 000 0000" />
                                            <div className="col-span-full">
                                                <OnboardingInput label="Street Address" icon={Home} value={formData.streetAddress} onChange={(v:any) => setFormData({...formData, streetAddress: v})} placeholder="123 Example Street, Sandton" />
                                            </div>
                                            <OnboardingInput label="City" icon={MapPin} value={formData.city} onChange={(v:any) => setFormData({...formData, city: v})} placeholder="Johannesburg" />
                                            <OnboardingInput label="State / Province" icon={MapPin} value={formData.state} onChange={(v:any) => setFormData({...formData, state: v})} placeholder="Gauteng" />
                                            <OnboardingInput label="Postal Code" icon={Settings} value={formData.postalCode} onChange={(v:any) => setFormData({...formData, postalCode: v})} placeholder="2196" />
                                            <OnboardingInput label="Country" icon={Globe} value={formData.country} onChange={(v:any) => setFormData({...formData, country: v})} placeholder="South Africa" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 2: Licensing */}
                            {step === 2 && (
                                <motion.div 
                                    key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Access & Licensing</h2>
                                        <p className="text-slate-500 text-sm">Assign Microsoft 365 cloud services.</p>
                                    </div>

                                    {loadingSkus ? (
                                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                            <Loader2 size={40} className="animate-spin text-blue-500" />
                                            <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">Querying Cloud SKUs...</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {availableSkus.map(sku => (
                                                <div 
                                                    key={sku.skuId}
                                                    onClick={() => toggleLicense(sku.skuId)}
                                                    className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative group ${
                                                        formData.licenseSkus.includes(sku.skuId)
                                                            ? 'bg-blue-600/10 border-blue-600 shadow-xl'
                                                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                                formData.licenseSkus.includes(sku.skuId) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                                                            }`}>
                                                                <CreditCard size={18} />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-sm font-bold text-white tracking-tight">{sku.skuPartNumber.replace(/_/g, ' ')}</div>
                                                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Available: {sku.prepaidUnits.enabled - sku.consumedUnits}</div>
                                                            </div>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center ${
                                                            formData.licenseSkus.includes(sku.skuId) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700'
                                                        }`}>
                                                            <CheckCircle2 size={14} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Step 3: Setup Checklist */}
                            {step === 3 && (
                                <motion.div 
                                    key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Onboarding Tasks</h2>
                                        <p className="text-slate-500 text-sm">Physical assets and manual administrative items.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { key: 'laptopIssued', title: 'Issue Laptop & Equipment', icon: HardDrive, detail: 'Verify serial numbers & compliance' },
                                            { key: 'securityBadge', title: 'Security Token / Pass', icon: Key, detail: 'Issue credentials for Head Office' },
                                            { key: 'welcomeEmail', title: 'Automated Welcome Pack', icon: Mail, detail: 'Company policy & IT Guide' },
                                            { key: 'introMeeting', title: 'Schedule Intro Meeting', icon: MapPin, detail: 'Team introduction via Teams' }
                                        ].map(item => (
                                            <div 
                                                key={item.key}
                                                onClick={() => setFormData({...formData, checklist: {...formData.checklist, [item.key]: !formData.checklist[item.key as keyof typeof formData.checklist]}})}
                                                className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between ${
                                                    formData.checklist[item.key as keyof typeof formData.checklist]
                                                        ? 'bg-emerald-600/10 border-emerald-600/30'
                                                        : 'bg-slate-950/50 border-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className={`p-4 rounded-2xl ${formData.checklist[item.key as keyof typeof formData.checklist] ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}>
                                                        <item.icon size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-lg font-bold text-white tracking-tight">{item.title}</div>
                                                        <div className="text-xs text-slate-500 font-medium">{item.detail}</div>
                                                    </div>
                                                </div>
                                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                                                    formData.checklist[item.key as keyof typeof formData.checklist] ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-800 bg-slate-900 text-transparent'
                                                }`}>
                                                    <CheckCircle2 size={20} strokeWidth={3} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 4: Summary & Provision */}
                            {step === 4 && (
                                <motion.div 
                                    key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Provisioning Summary</h2>
                                        <p className="text-slate-500 text-sm">Review the setup before pushing to Entra ID.</p>
                                    </div>

                                    <div className="bg-slate-950/80 rounded-3xl border border-slate-800 p-8 space-y-6">
                                        <div className="flex items-center gap-6 pb-6 border-b border-slate-900">
                                            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 font-black text-2xl">
                                                {formData.displayName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-2xl font-black text-white">{formData.displayName || 'Unnamed User'}</div>
                                                <div className="text-sm font-mono text-slate-500 italic">{formData.userPrincipalName || 'no-email@equinox.com'}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Legal Identity</div>
                                                <div className="text-sm text-slate-300 font-medium">{formData.givenName} {formData.surname}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Role & Org</div>
                                                <div className="text-sm text-slate-300 font-medium">{formData.jobTitle} • {formData.department}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Contact</div>
                                                <div className="text-sm text-slate-300 font-medium">{formData.mobilePhone || 'No Phone Set'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Password (Temporary)</div>
                                                <div className="text-sm font-mono text-emerald-500 select-all cursor-help" title="Click to copy">{formData.tempPassword}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Licenses Assigned</div>
                                                <div className="text-sm text-slate-300 font-medium">{formData.licenseSkus.length} cloud licenses</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Location</div>
                                                <div className="text-sm text-slate-300 font-medium">{formData.officeLocation} ({formData.city})</div>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-4 bg-rose-600/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 animate-bounce">
                                                <AlertCircle size={20} className="text-rose-500 shrink-0" />
                                                <div className="text-xs text-rose-500 font-bold uppercase tracking-tight">{error}</div>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={handleProvision}
                                        disabled={provisioning || !formData.displayName || !formData.userPrincipalName}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-black uppercase text-xs tracking-[0.2em] py-6 rounded-2xl transition-all shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3"
                                    >
                                        {provisioning ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} fill="currentColor" />}
                                        {provisioning ? 'Building Digital Identity...' : 'PROVISION USER'}
                                    </button>
                                </motion.div>
                            )}

                            {/* Step 5: Success */}
                            {step === 5 && (
                                <motion.div 
                                    key="step5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 flex flex-col items-center justify-center space-y-8"
                                >
                                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shadow-3xl shadow-emerald-500/10 border border-emerald-500/20 animate-pulse">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Success</h2>
                                        <p className="text-slate-500 font-medium italic">User has been provisioned successfully.</p>
                                    </div>
                                    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-900 text-left w-full space-y-4">
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 text-center border-b border-slate-900 pb-4">Internal Provisioning Log</div>
                                        <div className="space-y-3 font-mono text-[10px]">
                                            <div className="flex justify-between border-b border-slate-900 pb-3">
                                                <span className="text-slate-600">Entra Object ID:</span>
                                                <span className="text-blue-500">{provisionResult?.userId}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-900 pb-3">
                                                <span className="text-slate-600">M365 Licensing Status:</span>
                                                <span className="text-emerald-500 italic">Confirmed</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Security Group Injection:</span>
                                                <span className="text-emerald-500 italic">Pending Auto-Sync</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => window.location.reload()}
                                        className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors"
                                    >
                                        Start New Onboarding
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Navigation Bar */}
                    {step < 5 && (
                        <div className="border-t border-slate-800 p-8 flex justify-between items-center bg-slate-950/20">
                            <button 
                                onClick={handleBack}
                                disabled={step === 1}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all disabled:opacity-0"
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                            {step < 4 && (
                                <button 
                                    onClick={handleNext}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Next <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Sidebar: Context Panel */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                            <Shield size={64} className="text-white" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Enterprise Security</h3>
                            <p className="text-blue-100 text-sm font-medium leading-relaxed">By default, all new users are created with <span className="underline decoration-wavy">Double-Auth</span> forced on next sign-in.</p>
                            <div className="flex items-center gap-3 bg-blue-700/50 p-4 rounded-2xl border border-blue-400/20">
                                <Key size={20} className="text-blue-200" />
                                <div className="text-[10px] text-blue-100 font-bold uppercase tracking-tight leading-4">Temporary PIN will be valid for 48 hours only.</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                             <Settings size={20} className="text-slate-600" />
                             Configuration
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Global Admin</div>
                                <div className="text-xs text-emerald-500 font-black uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg">Active</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Graph Endpoint</div>
                                <div className="text-[10px] text-slate-400 font-mono">v1.0 (Production)</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Identity Sync</div>
                                <div className="text-xs text-blue-500 font-black uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-lg">Real-Time</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                }
                select {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 1rem center;
                    background-size: 1.25rem;
                }
            `}</style>
        </div>
    );
}
