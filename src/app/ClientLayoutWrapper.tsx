"use client";
import { usePathname } from 'next/navigation';
import NavWrapper from "@/components/NavWrapper";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublic = pathname?.startsWith('/sharepoint/agree');

    if (isPublic) {
        return <main className="min-h-screen">{children}</main>;
    }

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden print:h-auto print:overflow-visible">
            <NavWrapper />
            <main className="flex-1 md:ml-64 overflow-y-auto bg-gradient-to-br from-[#0b0f19] to-[#111827] print:ml-0 print:overflow-visible print:bg-white print:text-black">
                <div className="p-4 md:p-8 w-full min-h-full print:p-0 print:min-h-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
