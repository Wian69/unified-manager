"use client";

import { useEffect, useState } from "react";
import { HardDrive, RefreshCw } from "lucide-react";

export default function SharePointPage() {
    const [drives, setDrives] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDrives = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sharepoint');
            const data = await res.json();
            if (data.drives) {
                setDrives(data.drives);
            }
        } catch (error) {
            console.error("Failed to fetch SharePoint drives", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrives();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                        <HardDrive size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">SharePoint Drives</h1>
                        <p className="text-slate-400">View organization document libraries.</p>
                    </div>
                </div>
                <button 
                    onClick={fetchDrives}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-700"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-500">Loading drives...</div>
                ) : drives.length > 0 ? (
                    drives.map((d: any) => (
                        <div key={d.id} className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6 backdrop-blur-md hover:border-slate-700 transition-colors">
                            <h3 className="font-bold text-lg text-slate-200 mb-2 w-full truncate" title={d.name}>{d.name}</h3>
                            <p className="text-sm text-slate-400 mb-4 h-10 overflow-hidden">{d.description || "No description provided."}</p>
                            <a href={d.webUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                                Open in SharePoint &rarr;
                            </a>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-slate-500">No SharePoint drives found.</div>
                )}
            </div>
        </div>
    );
}
