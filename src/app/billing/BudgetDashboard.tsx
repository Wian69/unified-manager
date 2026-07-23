'use client';

import { useState } from 'react';
import { DollarSign, Plus, Trash2, Server, Laptop, Activity, Globe, MapPin, FileSpreadsheet, Users, Mail, X, CheckCircle2 } from 'lucide-react';

type BudgetItem = {
    id: string;
    name: string;
    cost: number;
    quantity: number;
    type?: string;
    date?: string;
    interval?: 'monthly' | 'yearly';
    description?: string;
    regions?: string[];
};

type BudgetData = {
    totalMonthlyBudget: number;
    software: BudgetItem[];
    hardware: BudgetItem[];
};

export default function BudgetDashboard({ 
    initialBudget, 
    m365RunRate, 
    azureRunRate,
    billingRegions
}: { 
    initialBudget: BudgetData, 
    m365RunRate: number, 
    azureRunRate: number,
    billingRegions: any[]
}) {
    const [budget, setBudget] = useState<BudgetData>(initialBudget);
    const [isSaving, setIsSaving] = useState(false);
    
    // Forms state
    const [newSoftware, setNewSoftware] = useState<{name: string, description: string, cost: number, quantity: number, interval: 'monthly'|'yearly', regions: string[]}>({ name: '', description: '', cost: 0, quantity: 1, interval: 'monthly', regions: [] });
    const [newHardware, setNewHardware] = useState<{name: string, description: string, cost: number, quantity: number, type: string}>({ name: '', description: '', cost: 0, quantity: 1, type: 'laptop' });
    const [editingSoftwareId, setEditingSoftwareId] = useState<string | null>(null);
    const [editingSoftwareData, setEditingSoftwareData] = useState<BudgetItem | null>(null);
    const [editingHardwareId, setEditingHardwareId] = useState<string | null>(null);
    const [editingHardwareData, setEditingHardwareData] = useState<BudgetItem | null>(null);

    // Email Modal State
    const [emailModalRegion, setEmailModalRegion] = useState<string | null>(null);
    const [emailTo, setEmailTo] = useState('');
    const [emailFrom, setEmailFrom] = useState('jan.reyneke@eqncs.com');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

    const handleSave = async (newBudget: BudgetData) => {
        setBudget(newBudget);
        setIsSaving(true);
        try {
            await fetch('/api/billing/budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBudget)
            });
        } catch (e) {
            console.error("Failed to save budget");
        }
        setIsSaving(false);
    };

    const addSoftware = () => {
        if (!newSoftware.name) return;
        const item: BudgetItem = { 
            id: Date.now().toString(), 
            name: newSoftware.name, 
            description: newSoftware.description,
            cost: Number(newSoftware.cost), 
            quantity: Number(newSoftware.quantity),
            interval: newSoftware.interval,
            regions: newSoftware.regions
        };
        handleSave({ ...budget, software: [...budget.software, item] });
        setNewSoftware({ name: '', description: '', cost: 0, quantity: 1, interval: 'monthly', regions: [] });
    };

    const removeSoftware = (id: string) => {
        handleSave({ ...budget, software: budget.software.filter(s => s.id !== id) });
    };

    const startEditingSoftware = (item: BudgetItem) => {
        setEditingSoftwareId(item.id);
        setEditingSoftwareData({ ...item, interval: item.interval || 'monthly', regions: item.regions || [] });
    };

    const saveEditingSoftware = () => {
        if (!editingSoftwareData) return;
        const updatedSoftware = budget.software.map(s => s.id === editingSoftwareId ? editingSoftwareData : s);
        handleSave({ ...budget, software: updatedSoftware });
        setEditingSoftwareId(null);
        setEditingSoftwareData(null);
    };

    const addHardware = () => {
        if (!newHardware.name) return;
        const item: BudgetItem = { 
            id: Date.now().toString(), 
            name: newHardware.name, 
            description: newHardware.description,
            cost: Number(newHardware.cost), 
            quantity: Number(newHardware.quantity),
            type: newHardware.type,
            date: new Date().toISOString().split('T')[0]
        };
        handleSave({ ...budget, hardware: [...budget.hardware, item] });
        setNewHardware({ name: '', description: '', cost: 0, quantity: 1, type: 'laptop' });
    };

    const removeHardware = (id: string) => {
        handleSave({ ...budget, hardware: budget.hardware.filter(s => s.id !== id) });
    };

    const startEditingHardware = (item: BudgetItem) => {
        setEditingHardwareId(item.id);
        setEditingHardwareData({ ...item, type: item.type || 'laptop' });
    };

    const saveEditingHardware = () => {
        if (!editingHardwareData) return;
        const updatedHardware = budget.hardware.map(s => s.id === editingHardwareId ? editingHardwareData : s);
        handleSave({ ...budget, hardware: updatedHardware });
        setEditingHardwareId(null);
        setEditingHardwareData(null);
    };

    const handleSendEmail = async () => {
        if (!emailModalRegion || !emailTo || !emailFrom) return;
        setIsSendingEmail(true);
        setEmailSuccess(null);
        try {
            const res = await fetch('/api/billing/send-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    region: emailModalRegion,
                    toEmail: emailTo,
                    fromEmail: emailFrom
                })
            });
            if (res.ok) {
                setEmailSuccess(`Invoice successfully sent to ${emailTo}!`);
                setTimeout(() => {
                    setEmailModalRegion(null);
                    setEmailSuccess(null);
                }, 3000);
            } else {
                const err = await res.json();
                alert(`Failed to send email: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert('An error occurred while sending the email.');
        } finally {
            setIsSendingEmail(false);
        }
    };

    const totalSoftwareRunRate = budget.software.reduce((sum, item) => {
        const itemMonthlyCost = item.interval === 'yearly' ? item.cost / 12 : item.cost;
        return sum + (itemMonthlyCost * item.quantity);
    }, 0);
    const currentRunRate = m365RunRate + azureRunRate + totalSoftwareRunRate;
    const remainingBudget = budget.totalMonthlyBudget - currentRunRate;
    
    // Hardware is usually CapEx, so we sum it separately
    const totalHardwareCost = budget.hardware.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

    return (
        <div className="space-y-12 mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Budget Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <DollarSign className="w-24 h-24 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Total Monthly IT Budget</h3>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-3xl font-black text-white">$</span>
                        <input 
                            type="number"
                            value={budget.totalMonthlyBudget}
                            onChange={(e) => setBudget({...budget, totalMonthlyBudget: Number(e.target.value)})}
                            onBlur={() => handleSave(budget)}
                            className="bg-transparent text-3xl font-black text-white focus:outline-none focus:border-b border-blue-500 w-full"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Overall allocated OpEx budget</p>
                </div>

                {/* Current Run Rate Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Current Run Rate</h3>
                    <div className="text-3xl font-black text-white mb-2">
                        ${currentRunRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    
                    <div className="space-y-1 mt-3 pt-3 border-t border-slate-800/50">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">M365 Licenses:</span>
                            <span className="text-white font-medium">${m365RunRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-emerald-500">Azure Servers/Add-ons:</span>
                            <span className="text-emerald-400 font-medium">${azureRunRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-indigo-400">Manual Software:</span>
                            <span className="text-indigo-300 font-medium">${totalSoftwareRunRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Remaining Budget Card */}
                <div className={`border rounded-2xl p-6 ${remainingBudget < 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                    <h3 className={`text-sm font-semibold uppercase tracking-widest mb-2 ${remainingBudget < 0 ? 'text-red-400' : 'text-emerald-400'}`}>Remaining Budget</h3>
                    <div className={`text-3xl font-black mb-1 ${remainingBudget < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        ${remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className={`text-xs mt-2 ${remainingBudget < 0 ? 'text-red-500/70' : 'text-emerald-500/70'}`}>
                        {remainingBudget < 0 ? 'Over budget!' : 'Available for allocation'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Custom Software Subscriptions */}
                <section className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-800/50 pb-4">
                        <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                            <Server className="text-indigo-400 w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Manual Software Subscriptions</h2>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                        {budget.software.map(item => {
                            const isEditing = editingSoftwareId === item.id;
                            if (isEditing && editingSoftwareData) {
                                return (
                                    <div key={item.id} className="flex flex-col gap-2 bg-slate-950/80 p-3 rounded-xl border border-indigo-500/50">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <input 
                                                value={editingSoftwareData.name}
                                                onChange={e => setEditingSoftwareData({...editingSoftwareData, name: e.target.value})}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white flex-1 min-w-[120px]"
                                                placeholder="Name"
                                            />
                                            <input 
                                                value={editingSoftwareData.description || ''}
                                                onChange={e => setEditingSoftwareData({...editingSoftwareData, description: e.target.value})}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white flex-1 min-w-[150px]"
                                                placeholder="Description (Optional)"
                                            />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex-1 flex flex-wrap gap-2 items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 min-w-[200px]">
                                                <span className="text-xs text-slate-400 mr-1">Regions:</span>
                                                {billingRegions.map(r => (
                                                    <label key={r.name} className="flex items-center gap-1 text-xs text-slate-300">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={(editingSoftwareData.regions || []).includes(r.name)}
                                                            onChange={e => {
                                                                const checked = e.target.checked;
                                                                const current = editingSoftwareData.regions || [];
                                                                setEditingSoftwareData({
                                                                    ...editingSoftwareData, 
                                                                    regions: checked ? [...current, r.name] : current.filter(x => x !== r.name)
                                                                });
                                                            }}
                                                        />
                                                        {r.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <select 
                                                value={editingSoftwareData.interval || 'monthly'}
                                                onChange={e => setEditingSoftwareData({...editingSoftwareData, interval: e.target.value as 'monthly'|'yearly'})}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white"
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">$</span>
                                                <input 
                                                    type="number"
                                                    value={editingSoftwareData.cost}
                                                    onChange={e => setEditingSoftwareData({...editingSoftwareData, cost: Number(e.target.value)})}
                                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white w-20"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">Qty:</span>
                                                <input 
                                                    type="number"
                                                    value={editingSoftwareData.quantity}
                                                    onChange={e => setEditingSoftwareData({...editingSoftwareData, quantity: Number(e.target.value)})}
                                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white w-16"
                                                />
                                            </div>
                                            <button onClick={saveEditingSoftware} className="text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 ml-auto">Save</button>
                                        </div>
                                    </div>
                                );
                            }

                            const itemMonthlyCost = item.interval === 'yearly' ? item.cost / 12 : item.cost;
                            return (
                                <div key={item.id} className="flex items-start justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800 hover:border-indigo-500/30 transition-colors group">
                                    <div className="flex-1 pr-4">
                                        <div className="font-semibold text-slate-200">{item.name}</div>
                                        {item.description && <div className="text-xs text-slate-400 mt-0.5 mb-1">{item.description}</div>}
                                        <div className="text-xs text-slate-500">{item.quantity} licenses @ ${item.cost.toFixed(2)}/{item.interval === 'yearly' ? 'yr' : 'mo'}</div>
                                        {item.regions && item.regions.length > 0 && (
                                            <div className="flex gap-1 mt-1.5 flex-wrap">
                                                {item.regions.map(r => (
                                                    <span key={r} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">{r}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-bold text-indigo-400">${(itemMonthlyCost * item.quantity).toFixed(2)}<span className="text-xs text-indigo-400/50">/mo</span></div>
                                            {item.interval === 'yearly' && <div className="text-[10px] text-slate-500">${(item.cost * item.quantity).toFixed(2)}/yr total</div>}
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEditingSoftware(item)} className="text-slate-500 hover:text-indigo-400 text-xs font-medium px-2 py-1 rounded bg-slate-800">
                                                Edit
                                            </button>
                                            <button onClick={() => removeSoftware(item.id)} className="text-slate-600 hover:text-red-400 p-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {budget.software.length === 0 && <div className="text-sm text-slate-500 italic">No manual subscriptions added.</div>}
                    </div>

                    <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/50 flex flex-col gap-3">
                        <div className="flex gap-3">
                            <input 
                                placeholder="Software Name (e.g. Adobe)" 
                                value={newSoftware.name}
                                onChange={e => setNewSoftware({...newSoftware, name: e.target.value})}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[150px] focus:outline-none focus:border-indigo-500"
                            />
                            <input 
                                                placeholder="Description (Optional)" 
                                                value={newSoftware.description}
                                                onChange={e => setNewSoftware({...newSoftware, description: e.target.value})}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[150px] focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                                            <span className="text-xs text-slate-400 mr-2">Allocate to Regions:</span>
                                            {billingRegions.map(r => (
                                                <label key={r.name} className="flex items-center gap-1.5 text-xs text-slate-300 mr-3 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="cursor-pointer"
                                                        checked={newSoftware.regions.includes(r.name)}
                                                        onChange={e => {
                                                            const checked = e.target.checked;
                                                            const current = newSoftware.regions;
                                                            setNewSoftware({
                                                                ...newSoftware, 
                                                                regions: checked ? [...current, r.name] : current.filter(x => x !== r.name)
                                                            });
                                                        }}
                                                    />
                                                    {r.name}
                                                </label>
                                            ))}
                                        </div>
                                        <div className="flex gap-3">
                                            <select 
                                                value={newSoftware.interval}
                                onChange={e => setNewSoftware({...newSoftware, interval: e.target.value as 'monthly'|'yearly'})}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                            <input 
                                type="number" placeholder="Cost" 
                                value={newSoftware.cost || ''}
                                onChange={e => setNewSoftware({...newSoftware, cost: Number(e.target.value)})}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-24 focus:outline-none focus:border-indigo-500"
                            />
                            <input 
                                type="number" placeholder="Qty" 
                                value={newSoftware.quantity || ''}
                                onChange={e => setNewSoftware({...newSoftware, quantity: Number(e.target.value)})}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-16 focus:outline-none focus:border-indigo-500"
                            />
                            <button onClick={addSoftware} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg p-2 transition-colors ml-auto">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Hardware Assets */}
                <section className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-800/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-orange-500/20 rounded-xl">
                                <Laptop className="text-orange-400 w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Hardware Assets (CapEx)</h2>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500 uppercase">Total Hardware</div>
                            <div className="text-xl font-black text-orange-400">${totalHardwareCost.toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                        {budget.hardware.map(item => {
                            const isEditing = editingHardwareId === item.id;
                            if (isEditing && editingHardwareData) {
                                return (
                                    <div key={item.id} className="flex flex-col gap-2 bg-slate-950/80 p-3 rounded-xl border border-orange-500/50">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <input 
                                                value={editingHardwareData.name}
                                                onChange={e => setEditingHardwareData({...editingHardwareData, name: e.target.value})}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white flex-1 min-w-[120px]"
                                                placeholder="Name"
                                            />
                                            <input 
                                                value={editingHardwareData.description || ''}
                                                onChange={e => setEditingHardwareData({...editingHardwareData, description: e.target.value})}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white flex-1 min-w-[150px]"
                                                placeholder="Description (Optional)"
                                            />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <select 
                                                value={editingHardwareData.type || 'laptop'}
                                                onChange={e => setEditingHardwareData({...editingHardwareData, type: e.target.value})}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white"
                                            >
                                                <option value="laptop">Laptop</option>
                                                <option value="desktop">Desktop</option>
                                                <option value="monitor">Monitor</option>
                                                <option value="accessory">Accessory</option>
                                                <option value="network">Networking</option>
                                            </select>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">$</span>
                                                <input 
                                                    type="number"
                                                    value={editingHardwareData.cost}
                                                    onChange={e => setEditingHardwareData({...editingHardwareData, cost: Number(e.target.value)})}
                                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white w-20"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">Qty:</span>
                                                <input 
                                                    type="number"
                                                    value={editingHardwareData.quantity}
                                                    onChange={e => setEditingHardwareData({...editingHardwareData, quantity: Number(e.target.value)})}
                                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white w-16"
                                                />
                                            </div>
                                            <button onClick={saveEditingHardware} className="text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 ml-auto">Save</button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={item.id} className="flex items-start justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800 hover:border-orange-500/30 transition-colors group">
                                    <div className="flex-1 pr-4">
                                        <div className="font-semibold text-slate-200">{item.name}</div>
                                        {item.description && <div className="text-xs text-slate-400 mt-0.5 mb-1">{item.description}</div>}
                                        <div className="text-xs text-slate-500">{item.quantity} {item.type}(s) @ ${item.cost.toFixed(2)} - {item.date}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="font-bold text-orange-400">${(item.cost * item.quantity).toFixed(2)}</div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEditingHardware(item)} className="text-slate-500 hover:text-orange-400 text-xs font-medium px-2 py-1 rounded bg-slate-800">
                                                Edit
                                            </button>
                                            <button onClick={() => removeHardware(item.id)} className="text-slate-600 hover:text-red-400 p-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {budget.hardware.length === 0 && <div className="text-sm text-slate-500 italic">No hardware recorded.</div>}
                    </div>

                    <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/50 flex flex-col gap-3">
                        <div className="flex gap-3">
                            <input 
                                placeholder="Hardware (e.g. Dell Monitor)" 
                                value={newHardware.name}
                                onChange={e => setNewHardware({...newHardware, name: e.target.value})}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[150px] focus:outline-none focus:border-orange-500"
                            />
                            <input 
                                placeholder="Description (Optional)" 
                                value={newHardware.description}
                                onChange={e => setNewHardware({...newHardware, description: e.target.value})}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[150px] focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <div className="flex gap-3">
                            <select 
                                value={newHardware.type}
                                onChange={e => setNewHardware({...newHardware, type: e.target.value})}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                            >
                                <option value="laptop">Laptop</option>
                                <option value="desktop">Desktop</option>
                                <option value="monitor">Monitor</option>
                                <option value="accessory">Accessory</option>
                                <option value="network">Networking</option>
                            </select>
                            <input 
                                type="number" placeholder="Cost" 
                                value={newHardware.cost || ''}
                                onChange={e => setNewHardware({...newHardware, cost: Number(e.target.value)})}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-24 focus:outline-none focus:border-orange-500"
                            />
                            <input 
                                type="number" placeholder="Qty" 
                                value={newHardware.quantity || ''}
                                onChange={e => setNewHardware({...newHardware, quantity: Number(e.target.value)})}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-20 focus:outline-none focus:border-orange-500"
                            />
                            <button onClick={addHardware} className="bg-orange-600 hover:bg-orange-500 text-white rounded-lg p-2 transition-colors ml-auto">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </section>
            </div>
            
            <div className="space-y-12">
                {billingRegions?.sort((a: any, b: any) => b.totalCost - a.totalCost).map((region: any, rIdx: number) => {
                    // Calculate allocated costs for this region
                    let regionAllocatedCost = 0;
                    const allocatedItems: any[] = [];
                    
                    // 1. Azure Allocation (Equal split across main regions)
                    const mainRegions = billingRegions.filter(r => ['Northern Region', 'Eastern Region', 'Southern Region', 'Western Region'].includes(r.name));
                    const isMainRegion = mainRegions.some(r => r.name === region.name);
                    
                    if (isMainRegion && mainRegions.length > 0 && azureRunRate > 0) {
                        const azureSplit = azureRunRate / mainRegions.length;
                        regionAllocatedCost += azureSplit;
                        allocatedItems.push({
                            name: "Azure Servers & Add-ons",
                            allocatedCost: azureSplit,
                            proportionLabel: `Equal Split (1 of ${mainRegions.length})`,
                            originalCost: azureRunRate
                        });
                    }

                    // 2. Custom Software Allocation
                    budget.software.forEach(sw => {
                        if (sw.regions && sw.regions.includes(region.name)) {
                            // Find licensed users across all selected regions for this software
                            const totalUsersInSelectedRegions = billingRegions
                                .filter(r => sw.regions!.includes(r.name))
                                .reduce((sum, r) => sum + (r.licensedUsers || 0), 0);

                            if (totalUsersInSelectedRegions > 0) {
                                const proportion = (region.licensedUsers || 0) / totalUsersInSelectedRegions;
                                const swMonthlyCost = sw.interval === 'yearly' ? sw.cost / 12 : sw.cost;
                                const allocatedCost = (swMonthlyCost * sw.quantity) * proportion;
                                
                                regionAllocatedCost += allocatedCost;
                                allocatedItems.push({
                                    name: sw.name,
                                    allocatedCost,
                                    proportionLabel: `${(proportion * 100).toFixed(1)}% (Licensed Users)`,
                                    originalCost: swMonthlyCost * sw.quantity
                                });
                            }
                        }
                    });

                    const regionTotalCost = region.totalCost + regionAllocatedCost;

                    return (
                        <section key={rIdx} className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden group/region print:bg-white print:border-none print:shadow-none print:p-0 print:mb-12">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/region:opacity-10 transition-opacity print:hidden">
                                <Globe className="w-48 h-48 text-blue-500" />
                            </div>
                            
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-slate-800/50 pb-6 relative z-10 print:border-slate-300">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2.5 bg-blue-500/20 rounded-xl print:bg-transparent print:p-0">
                                            <MapPin className="text-blue-400 w-6 h-6 print:text-black" />
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-tight print:text-black">{region.name}</h2>
                                    </div>
                                    <p className="text-slate-400 text-sm ml-14 print:ml-0 print:text-slate-600">
                                        Total Users in Region: <strong className="text-white print:text-black">{region.totalUsers}</strong>
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-2 print:hidden">
                                        <button 
                                            onClick={() => setEmailModalRegion(region.name)}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Email Invoice
                                        </button>
                                        <button 
                                            onClick={() => window.print()}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors border border-slate-700"
                                        >
                                            Print Invoice
                                        </button>
                                        <a 
                                            href={`/api/billing/export?region=${encodeURIComponent(region.name)}`}
                                            download
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
                                        >
                                            Download CSV
                                        </a>
                                    </div>
                                    <div className="text-right bg-slate-950/50 p-4 rounded-2xl border border-slate-800 print:bg-transparent print:border-none print:p-0">
                                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 print:text-slate-600">Region Total Cost</div>
                                        <div className="text-3xl font-black text-blue-400 print:text-black">
                                            ${regionTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 print:grid-cols-1">
                                {region.products?.sort((a: any, b: any) => b.totalCost - a.totalCost).map((product: any, pIdx: number) => (
                                    <div key={pIdx} className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-colors print:border-slate-300 print:bg-transparent">
                                        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 bg-slate-900/80 print:bg-transparent print:border-slate-300">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-800 rounded-lg print:hidden">
                                                    <FileSpreadsheet className="text-slate-300 w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-md font-bold text-slate-200 print:text-black">{product.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 print:text-slate-600">
                                                        <span className="flex items-center gap-1 font-medium text-slate-400 print:text-slate-700"><Users className="w-3 h-3" /> {product.users.length}</span>
                                                        <span>•</span>
                                                        <span>${product.unitPrice.toFixed(2)} / mo</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-slate-300 print:text-black">
                                                    ${product.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-0 max-h-60 overflow-y-auto custom-scrollbar print:max-h-none print:overflow-visible">
                                            <table className="w-full text-left text-sm text-slate-400 print:text-black">
                                                <tbody className="divide-y divide-slate-800/30 print:divide-slate-200">
                                                    {product.users.map((user: string, i: number) => (
                                                        <tr key={i} className="hover:bg-slate-800/40 transition-colors print:hover:bg-transparent">
                                                            <td className="px-5 py-2.5 truncate">{user}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}

                                {allocatedItems.length > 0 && (
                                    <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl overflow-hidden print:border-slate-300 print:bg-transparent lg:col-span-2 print:col-span-1 mt-4">
                                        <div className="p-5 border-b border-indigo-500/30 bg-indigo-900/20 print:bg-transparent print:border-slate-300">
                                            <h4 className="text-lg font-bold text-indigo-300 print:text-black flex items-center gap-2">
                                                <Server className="w-5 h-5 print:hidden" />
                                                Allocated Services & Software
                                            </h4>
                                            <p className="text-xs text-indigo-300/70 mt-1 print:text-slate-600">Azure costs split equally, software split by licensed users</p>
                                        </div>
                                        <div className="p-0">
                                            <table className="w-full text-left text-sm text-indigo-200/80 print:text-black">
                                                <thead className="bg-indigo-950/50 text-xs uppercase text-indigo-300/50 print:bg-slate-100 print:text-slate-600 border-b border-indigo-500/20 print:border-slate-300">
                                                    <tr>
                                                        <th className="px-5 py-3">Service / Software</th>
                                                        <th className="px-5 py-3 text-right">Allocation Rule</th>
                                                        <th className="px-5 py-3 text-right">Allocated Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-indigo-500/10 print:divide-slate-200">
                                                    {allocatedItems.map((item, i) => (
                                                        <tr key={i} className="hover:bg-indigo-900/30 transition-colors print:hover:bg-transparent">
                                                            <td className="px-5 py-3 font-medium text-indigo-100 print:text-black">{item.name}</td>
                                                            <td className="px-5 py-3 text-right">{item.proportionLabel} <span className="text-indigo-400/50 text-xs">of ${item.originalCost.toFixed(2)}</span></td>
                                                            <td className="px-5 py-3 text-right font-bold text-indigo-300 print:text-black">${item.allocatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
            
            {isSaving && <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 print:hidden z-50">
                <Activity className="w-4 h-4 animate-spin" /> Saving Budget...
            </div>}

            {/* Email Invoice Modal */}
            {emailModalRegion && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Mail className="w-5 h-5 text-indigo-400" />
                                Email Invoice: {emailModalRegion}
                            </h3>
                            <button onClick={() => {setEmailModalRegion(null); setEmailSuccess(null);}} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {emailSuccess ? (
                                <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 text-emerald-400">
                                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                                    <p className="font-medium text-sm">{emailSuccess}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Send To:</label>
                                        <input 
                                            type="email" 
                                            placeholder="manager@eqncs.com"
                                            value={emailTo}
                                            onChange={e => setEmailTo(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Send From:</label>
                                        <input 
                                            type="email" 
                                            value={emailFrom}
                                            onChange={e => setEmailFrom(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none focus:border-indigo-500"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">Must be a valid internal mailbox with Send permissions.</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {!emailSuccess && (
                            <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex justify-end gap-3">
                                <button 
                                    onClick={() => setEmailModalRegion(null)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSendEmail}
                                    disabled={!emailTo || !emailFrom || isSendingEmail}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {isSendingEmail ? <Activity className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    Send Invoice
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
