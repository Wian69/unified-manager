"use client";

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Search, Bell } from 'lucide-react';

export default function NavWrapper() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <>
            {/* Mobile Header */}
            <header className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800 md:hidden sticky top-0 z-40">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -ml-2 text-slate-400 hover:text-white transition-all"
                >
                    <Menu size={24} />
                </button>
                
                <h1 className="text-sm font-black text-white tracking-widest uppercase italic">
                    <span className="text-blue-500">Eqn</span> Manager
                </h1>

                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    AD
                </div>
            </header>

            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
        </>
    );
}
