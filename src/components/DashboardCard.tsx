export default function DashboardCard({ 
    title, value, description, icon 
}: { 
    title: string; value: string | number; description?: string; icon: React.ReactNode 
}) {
    return (
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-slate-800/60 hover:border-slate-700 transition-all duration-300 transform hover:-translate-y-1 shadow-xl shadow-black/20">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-100">{value}</h3>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl text-blue-400">
                    {icon}
                </div>
            </div>
            {description && (
                <p className="text-sm text-slate-500">{description}</p>
            )}
        </div>
    );
}
