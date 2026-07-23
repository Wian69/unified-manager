'use client';

import { useState } from 'react';
import { DollarSign, Plus, Trash2, Server, Laptop, Activity } from 'lucide-react';

type BudgetItem = {
    id: string;
    name: string;
    cost: number;
    quantity: number;
    type?: string;
    date?: string;
};

type BudgetData = {
    totalMonthlyBudget: number;
    software: BudgetItem[];
    hardware: BudgetItem[];
};

export default function BudgetDashboard({ 
    initialBudget, 
    m365RunRate, 
    azureRunRate 
}: { 
    initialBudget: BudgetData, 
    m365RunRate: number, 
    azureRunRate: number 
}) {
    const [budget, setBudget] = useState<BudgetData>(initialBudget);
    const [isSaving, setIsSaving] = useState(false);
    
    // Forms state
    const [newSoftware, setNewSoftware] = useState({ name: '', cost: 0, quantity: 1 });
    const [newHardware, setNewHardware] = useState({ name: '', cost: 0, quantity: 1, type: 'laptop' });

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
            cost: Number(newSoftware.cost), 
            quantity: Number(newSoftware.quantity) 
        };
        handleSave({ ...budget, software: [...budget.software, item] });
        setNewSoftware({ name: '', cost: 0, quantity: 1 });
    };

    const removeSoftware = (id: string) => {
        handleSave({ ...budget, software: budget.software.filter(s => s.id !== id) });
    };

    const addHardware = () => {
        if (!newHardware.name) return;
        const item: BudgetItem = { 
            id: Date.now().toString(), 
            name: newHardware.name, 
            cost: Number(newHardware.cost), 
            quantity: Number(newHardware.quantity),
            type: newHardware.type,
            date: new Date().toISOString().split('T')[0]
        };
        handleSave({ ...budget, hardware: [...budget.hardware, item] });
        setNewHardware({ name: '', cost: 0, quantity: 1, type: 'laptop' });
    };

    const removeHardware = (id: string) => {
        handleSave({ ...budget, hardware: budget.hardware.filter(s => s.id !== id) });
    };

    const totalSoftwareRunRate = budget.software.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    const currentRunRate = m365RunRate + azureRunRate + totalSoftwareRunRate;
    const remainingBudget = budget.totalMonthlyBudget - currentRunRate;
    
    // Hardware is usually CapEx, so we sum it separately
    const totalHardwareCost = budget.hardware.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

    return (
        <div className="space-y-12 mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Budget Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
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
                        {budget.software.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                                <div>
                                    <div className="font-semibold text-slate-200">{item.name}</div>
                                    <div className="text-xs text-slate-500">{item.quantity} licenses @ ${item.cost.toFixed(2)}/mo</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="font-bold text-indigo-400">${(item.cost * item.quantity).toFixed(2)}</div>
                                    <button onClick={() => removeSoftware(item.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {budget.software.length === 0 && <div className="text-sm text-slate-500 italic">No manual subscriptions added.</div>}
                    </div>

                    <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/50 flex gap-3">
                        <input 
                            placeholder="Software Name (e.g. Adobe)" 
                            value={newSoftware.name}
                            onChange={e => setNewSoftware({...newSoftware, name: e.target.value})}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white flex-1 focus:outline-none focus:border-indigo-500"
                        />
                        <input 
                            type="number" placeholder="Cost/mo" 
                            value={newSoftware.cost || ''}
                            onChange={e => setNewSoftware({...newSoftware, cost: Number(e.target.value)})}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-24 focus:outline-none focus:border-indigo-500"
                        />
                        <input 
                            type="number" placeholder="Qty" 
                            value={newSoftware.quantity || ''}
                            onChange={e => setNewSoftware({...newSoftware, quantity: Number(e.target.value)})}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-20 focus:outline-none focus:border-indigo-500"
                        />
                        <button onClick={addSoftware} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg p-2 transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
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
                        {budget.hardware.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                                <div>
                                    <div className="font-semibold text-slate-200">{item.name}</div>
                                    <div className="text-xs text-slate-500">{item.quantity} {item.type}(s) @ ${item.cost.toFixed(2)} - {item.date}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="font-bold text-orange-400">${(item.cost * item.quantity).toFixed(2)}</div>
                                    <button onClick={() => removeHardware(item.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {budget.hardware.length === 0 && <div className="text-sm text-slate-500 italic">No hardware recorded.</div>}
                    </div>

                    <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/50 flex flex-wrap gap-3">
                        <input 
                            placeholder="Hardware (e.g. Dell Monitor)" 
                            value={newHardware.name}
                            onChange={e => setNewHardware({...newHardware, name: e.target.value})}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[150px] focus:outline-none focus:border-orange-500"
                        />
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
                        <button onClick={addHardware} className="bg-orange-600 hover:bg-orange-500 text-white rounded-lg p-2 transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </section>
            </div>
            
            {isSaving && <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 animate-spin" /> Saving Budget...
            </div>}
        </div>
    );
}
