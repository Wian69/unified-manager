"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Laptop, 
    Users, 
    HardDrive, 
    UserMinus,
    ShieldAlert,
    Trash2
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Devices', icon: Laptop, path: '/devices' },
        { name: 'Offboarding', icon: UserMinus, path: '/offboarding' },
        { name: 'Users', icon: Users, path: '/users' },
        { name: 'SharePoint', icon: HardDrive, path: '/sharepoint' },
        { name: 'File Deletions', icon: Trash2, path: '/sharepoint/deleted' },
    ];

    return (
        <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 text-slate-300 flex flex-col h-screen fixed z-40">
            <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/50">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                    Unified Manager
                </h1>
            </div>
            <nav className="flex-1 py-6 flex flex-col gap-2 px-4">
                {navItems.map((item) => (
                    <NavItem 
                        key={item.path}
                        href={item.path} 
                        icon={<item.icon size={20} />} 
                        label={item.name} 
                        active={pathname === item.path}
                    />
                ))}
            </nav>
            <div className="p-6 text-xs text-slate-500 border-t border-slate-800">
                &copy; {new Date().getFullYear()} Unified Management
            </div>
        </aside>
    );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
    return (
        <Link 
            href={href} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                active 
                ? 'bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20' 
                : 'hover:bg-slate-800/50 hover:text-white border border-transparent'
            }`}
        >
            <span className={active ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400 transition-colors'}>
                {icon}
            </span>
            <span className="font-medium">{label}</span>
        </Link>
    );
}
