import { Download, FileSpreadsheet, Activity, DollarSign, Users, ChevronDown, ChevronUp } from 'lucide-react';
import billingData from '../../data/billing_data.json';

export default function BillingPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Activity className="text-blue-500" /> 
                        Billing & Licensing
                    </h1>
                    <p className="text-slate-400">View and download consolidated monthly billing and M365 licensing reports.</p>
                </div>
                <a 
                    href="/reports/CFO_Billing_Report.csv" 
                    download
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                    <Download className="w-4 h-4" />
                    Download CSV
                </a>
            </header>

            {billingData ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Total Cost Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <DollarSign className="w-24 h-24 text-blue-500" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Total Monthly Spend</h3>
                            <div className="text-4xl font-black text-white mb-1">
                                ${parseFloat(billingData.totalAmount as unknown as string).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                                Last Generated: {billingData.generatedAt}
                            </div>
                        </div>

                        {/* M365 Cost Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">M365 Licenses</h3>
                            <div className="text-3xl font-black text-blue-400 mb-1">
                                ${parseFloat(billingData.primaryCost as unknown as string).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Calculated from assigned products
                            </p>
                        </div>

                        {/* Azure Cost Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Azure Infrastructure</h3>
                            <div className="text-3xl font-black text-emerald-400 mb-1">
                                ${parseFloat(billingData.secondaryCost as unknown as string).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Azure Plan subscription cost
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-white mb-4">Assigned Products & Costs</h2>
                        {billingData.products?.sort((a: any, b: any) => b.totalCost - a.totalCost).map((product: any, idx: number) => (
                            <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden group">
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 bg-slate-900/80">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/10 rounded-xl">
                                            <FileSpreadsheet className="text-blue-500 w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{product.name}</h3>
                                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {product.users.length} Users</span>
                                                <span>•</span>
                                                <span>${product.unitPrice.toFixed(2)} per user/month</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-slate-400 mb-1">Total Product Cost</div>
                                        <div className="text-2xl font-black text-blue-400">${product.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                                
                                <div className="p-0">
                                    <table className="w-full text-left text-sm text-slate-300">
                                        <thead className="text-xs text-slate-500 bg-slate-950/50 uppercase">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold tracking-wider">Assigned User</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {product.users.map((user: string, i: number) => (
                                                <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                                    <td className="px-6 py-3">{user}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
                    <FileSpreadsheet className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Data Available</h3>
                    <p className="text-slate-400">The billing report has not been generated yet this month.</p>
                </div>
            )}
        </div>
    );
}
