import Link from 'next/link';
import { Home, Laptop, Users, Shield, HardDrive } from 'lucide-react';

export default function Sidebar() {
    return (
        <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 text-slate-300 flex flex-col h-screen fixed">
            <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/50">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                    Unified Manager
                </h1>
            </div>
            <nav className="flex-1 py-6 flex flex-col gap-2 px-4">
                <NavItem href="/" icon={<Home size={20} />} label="Dashboard" />
                <NavItem href="/devices" icon={<Laptop size={20} />} label="Devices" />
                <NavItem href="/users" icon={<Users size={20} />} label="Users" />
                <NavItem href="/sharepoint" icon={<HardDrive size={20} />} label="SharePoint" />
            </nav>
            <div className="p-6 text-xs text-slate-500 border-t border-slate-800">
                &copy; {new Date().getFullYear()} Unified Management
            </div>
        </aside>
    );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link 
            href={href} 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 hover:text-white transition-all duration-200 group"
        >
            <span className="text-slate-400 group-hover:text-blue-400 transition-colors">
                {icon}
            </span>
            <span className="font-medium">{label}</span>
        </Link>
    );
}
