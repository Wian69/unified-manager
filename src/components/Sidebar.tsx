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
    Trash2,
    Settings,
    X,
    Menu,
    Calendar,
    ClipboardList,
    Zap
} from 'lucide-react';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Devices', icon: Laptop, path: '/devices' },
        { name: 'Forms', icon: ClipboardList, path: '/forms' },
        { name: 'Cloud Flows', icon: Zap, path: '/flows' },
        { name: 'Offboarding', icon: UserMinus, path: '/offboarding' },
        { name: 'Users', icon: Users, path: '/users' },
        { name: 'SharePoint', icon: HardDrive, path: '/sharepoint' },
        { name: 'Meeting Rooms', icon: Calendar, path: '/rooms' },
        { name: 'Settings', icon: Settings, path: '/settings' },
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[45] md:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`
                w-72 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen fixed z-50 print:hidden transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:w-64
            `}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/50">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        <span className="text-blue-600 uppercase italic">Eqn</span> <span className="text-slate-500 font-medium text-lg">MANAGER</span>
                    </h1>
                    {onClose && (
                        <button onClick={onClose} className="md:hidden p-2 text-slate-500 hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    )}
                </div>
                <nav className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavItem 
                            key={item.path}
                            href={item.path} 
                            icon={<item.icon size={20} />} 
                            label={item.name} 
                            active={pathname === item.path}
                            onClick={onClose}
                        />
                    ))}
                </nav>
                <div className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-t border-slate-800 bg-slate-950/20">
                    &copy; {new Date().getFullYear()} Equinox Group
                </div>
            </aside>
        </>
    );
}

function NavItem({ href, icon, label, active, onClick }: { href: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }) {
    return (
        <Link 
            href={href} 
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                active 
                ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-600/20' 
                : 'hover:bg-slate-800/50 hover:text-white border border-transparent'
            }`}
        >
            <span className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'}>
                {icon}
            </span>
            <span className="text-[13px] font-bold uppercase tracking-wide">{label}</span>
        </Link>
    );
}
