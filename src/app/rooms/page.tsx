import React from 'react';
import NavWrapper from '@/components/NavWrapper';
import RoomCalendar from '@/components/RoomCalendar';

export default function RoomsPage() {
    return (
        <div className="flex min-h-screen bg-[#0b0f19]">
            <NavWrapper />
            <main className="flex-1 md:ml-64 p-8 md:p-12">
                <div className="max-w-[1600px] mx-auto space-y-12">
                    {/* Page Header */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 text-blue-500 font-black text-[10px] uppercase tracking-[0.3em]">
                            <div className="w-8 h-[2px] bg-blue-500" />
                            Office Management
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                            Meeting Room <span className="text-slate-500">Resource Hub</span>
                        </h1>
                        <p className="text-slate-400 max-w-2xl leading-relaxed">
                            Monitor and manage physical workspace utilization across the organization. View real-time availability, identifying booking overlaps and resource optimization opportunities.
                        </p>
                    </div>

                    {/* Main Calendar Section */}
                    <section>
                        <RoomCalendar />
                    </section>
                </div>
            </main>
        </div>
    );
}
