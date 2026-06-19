import { Download, FileSpreadsheet, Activity, DollarSign, Users, Globe, MapPin } from 'lucide-react';
import { fetchBillingData } from '../../lib/billing';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
    const billingData = await fetchBillingData();
    const calculatedM365RunRate = billingData.calculatedM365RunRate;
    const projectedNextBill = billingData.projectedNextBill;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Activity className="text-blue-500" /> 
                        Billing & Licensing
                    </h1>
                    <p className="text-slate-400">Live consolidated monthly billing categorized by Region.</p>
                </div>
                <a 
                    href="/api/billing/export" 
                    download
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                    <Download className="w-4 h-4" />
                    Download CSV
                </a>
            </header>

            {billingData ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        {/* Actual Paid Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <DollarSign className="w-24 h-24 text-blue-500" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Last Invoice (Paid)</h3>
                            <div className="text-3xl font-black text-white mb-1">
                                ${parseFloat(billingData.totalAmount as unknown as string).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                                Actual billed by Microsoft last month
                            </div>
                        </div>

                        {/* Projected Next Bill Card */}
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden">
                            <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-widest mb-2">Projected Next Bill</h3>
                            <div className="text-3xl font-black text-blue-400 mb-1">
                                ${projectedNextBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-blue-300/70 mt-2">
                                Forecast based on active license assignments
                            </p>
                        </div>

                        {/* M365 Cost Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">M365 Run Rate</h3>
                            <div className="text-2xl font-black text-white mb-1">
                                ${calculatedM365RunRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Calculated from assigned products
                            </p>
                        </div>

                        {/* Azure Cost Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Azure Run Rate</h3>
                            <div className="text-2xl font-black text-emerald-400 mb-1">
                                ${parseFloat(billingData.secondaryCost as unknown as string).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Current Azure Plan charges
                            </p>
                        </div>
                    </div>

                    <div className="space-y-12">
                        {billingData.regions?.sort((a: any, b: any) => b.totalCost - a.totalCost).map((region: any, rIdx: number) => (
                            <section key={rIdx} className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Globe className="w-48 h-48 text-blue-500" />
                                </div>
                                
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-slate-800/50 pb-6 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2.5 bg-blue-500/20 rounded-xl">
                                                <MapPin className="text-blue-400 w-6 h-6" />
                                            </div>
                                            <h2 className="text-3xl font-black text-white tracking-tight">{region.name}</h2>
                                        </div>
                                        <p className="text-slate-400 text-sm ml-14">
                                            Total Users in Region: <strong className="text-white">{region.totalUsers}</strong>
                                        </p>
                                    </div>
                                    <div className="text-right bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Region Cost</div>
                                        <div className="text-3xl font-black text-blue-400">
                                            ${region.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                                    {region.products?.sort((a: any, b: any) => b.totalCost - a.totalCost).map((product: any, pIdx: number) => (
                                        <div key={pIdx} className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-colors">
                                            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 bg-slate-900/80">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-800 rounded-lg">
                                                        <FileSpreadsheet className="text-slate-300 w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-md font-bold text-slate-200">{product.name}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                            <span className="flex items-center gap-1 font-medium text-slate-400"><Users className="w-3 h-3" /> {product.users.length}</span>
                                                            <span>•</span>
                                                            <span>${product.unitPrice.toFixed(2)} / mo</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-slate-300">
                                                        ${product.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="p-0 max-h-60 overflow-y-auto custom-scrollbar">
                                                <table className="w-full text-left text-sm text-slate-400">
                                                    <tbody className="divide-y divide-slate-800/30">
                                                        {product.users.map((user: string, i: number) => (
                                                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                                                                <td className="px-5 py-2.5 truncate">{user}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
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
