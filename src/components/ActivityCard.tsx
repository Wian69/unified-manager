import React from 'react';

export default function ActivityCard({ title, device, time, severity }: { title: string, device: string, time: string, severity: string }) {
    return (
        <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all">
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : 
                    severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                    {severity}
                </span>
                <span className="text-[10px] text-slate-500">{time}</span>
            </div>
            <p className="text-sm font-bold text-slate-200 mb-1">{title}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{device}</p>
        </div>
    );
}
