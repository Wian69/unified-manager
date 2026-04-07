'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, 
    Search, 
    Edit3, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    X, 
    Save, 
    Filter, 
    ExternalLink,
    ChevronRight,
    CircleCheck,
    Plus
} from 'lucide-react';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Column {
    id: string;
    name: string;
    displayName: string;
    type: string;
    choices?: string[];
}

interface Item {
    id: string;
    fields: Record<string, any>;
}

export default function FormDetailsPage({ params }: { params: Promise<{ listId: string }> }) {
    const { listId } = use(params);
    const [items, setItems] = useState<Item[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [editData, setEditData] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [itemsRes, columnsRes] = await Promise.all([
                    fetch(`/api/forms/items?listId=${listId}`),
                    fetch(`/api/forms/columns?listId=${listId}`)
                ]);

                const itemsData = await itemsRes.json();
                const columnsData = await columnsRes.json();

                if (itemsData.error) throw new Error(itemsData.error);
                if (columnsData.error) throw new Error(columnsData.error);

                setItems(itemsData.items);
                setColumns(columnsData.columns);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [listId]);

    const filteredItems = items.filter(item => 
        Object.values(item.fields).some(val => 
            String(val).toLowerCase().includes(search.toLowerCase())
        )
    );

    const handleEdit = (item: Item) => {
        setSelectedItem(item);
        setEditData({ ...item.fields });
        setSaveStatus('idle');
    };

    const handleAddNew = () => {
        setSelectedItem({ id: '', fields: {} });
        setEditData({});
        setSaveStatus('idle');
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus('idle');
        try {
            const isNew = !selectedItem?.id;
            const url = isNew 
                ? `/api/forms/items?listId=${listId}` 
                : `/api/forms/items?listId=${listId}&itemId=${selectedItem?.id}`;
            const method = isNew ? 'POST' : 'PATCH';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: editData })
            });

            if (!res.ok) throw new Error('Save failed');
            const data = await res.json();

            // Refresh local items
            if (isNew) {
                setItems(prev => [data.item, ...prev]);
            } else {
                setItems(prev => prev.map(item => item.id === selectedItem?.id ? { ...item, fields: editData } : item));
            }
            
            setSaveStatus('success');
            setTimeout(() => {
                setSelectedItem(null);
                setSaveStatus('idle');
            }, 1500);
        } catch (err: any) {
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;
    if (error) return <div className="p-8 text-red-500 bg-red-500/10 rounded-2xl border border-red-500/20 max-w-xl mx-auto mt-12 flex items-center gap-3"><AlertCircle size={20} /> {error}</div>;

    const listName = listId === 'ec7c28b2-d2bc-4d99-8550-499f385fd58d' ? 'IT Support Tickets' : 'New User add';

    return (
        <div className="p-8 space-y-8 min-h-screen relative overflow-hidden">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4">
                    <Link href="/forms" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Forms
                    </Link>
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase">
                        {listName}
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        <Plus size={16} /> New Response
                    </button>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search submissions..." 
                            className="bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all w-72 text-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                {columns.slice(0, 5).map(col => (
                                    <th key={col.id} className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 truncate max-w-[200px]">
                                        {col.displayName}
                                    </th>
                                ))}
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredItems.map((item, idx) => (
                                <motion.tr 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={item.id} 
                                    className="hover:bg-slate-800/30 transition-colors group"
                                >
                                    {columns.slice(0, 5).map(col => (
                                        <td key={col.id} className="p-6 text-sm font-medium text-slate-300">
                                            <span className="line-clamp-2 max-w-[200px]">
                                                {String(item.fields[col.name] || '—')}
                                            </span>
                                        </td>
                                    ))}
                                    <td className="p-6 text-right">
                                        <button 
                                            onClick={() => handleEdit(item)}
                                            className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredItems.length === 0 && (
                    <div className="p-20 text-center space-y-4">
                        <div className="bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto">
                            <Search className="text-slate-500" size={20} />
                        </div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No records found</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm shadow-2xl"
                        />
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-2xl bg-slate-900 h-full border-l border-slate-800 flex flex-col shadow-2xl"
                        >
                            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Details & Edit</p>
                                    <h2 className="text-xl font-black text-white uppercase truncate max-w-[400px]">
                                        {selectedItem.fields.Title || 'Request Details'}
                                    </h2>
                                </div>
                                <button 
                                    onClick={() => setSelectedItem(null)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <div className="grid grid-cols-1 gap-6">
                                    {columns.map(col => (
                                        <div key={col.id} className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block px-1">
                                                {col.displayName}
                                            </label>
                                            {col.type === 'choice' ? (
                                                <select 
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                                    value={editData[col.name] || ''}
                                                    onChange={(e) => setEditData(prev => ({ ...prev, [col.name]: e.target.value }))}
                                                >
                                                    <option value="">Select an option</option>
                                                    {col.choices?.map(choice => (
                                                        <option key={choice} value={choice}>{choice}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <textarea 
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all min-h-[50px] resize-none"
                                                    value={editData[col.name] || ''}
                                                    rows={String(editData[col.name]).length > 100 ? 4 : 1}
                                                    onChange={(e) => setEditData(prev => ({ ...prev, [col.name]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                                <button 
                                    onClick={() => setSelectedItem(null)}
                                    className="px-6 py-3 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving || saveStatus === 'success'}
                                    className={cn(
                                        "px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all transform active:scale-95",
                                        saveStatus === 'success' ? "bg-green-600 text-white" : 
                                        saveStatus === 'error' ? "bg-red-600 text-white" :
                                        "bg-blue-600 text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/20"
                                    )}
                                >
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : 
                                     saveStatus === 'success' ? <CircleCheck size={16} /> : 
                                     saveStatus === 'error' ? <AlertCircle size={16} /> : 
                                     <Save size={16} />}
                                    {saving ? 'Saving...' : 
                                     saveStatus === 'success' ? 'Changes Saved' : 
                                     saveStatus === 'error' ? 'Retry Save' : 
                                     'Apply Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
