import { Download, FileSpreadsheet, Activity, Globe, MapPin, Users } from 'lucide-react';
import { fetchBillingData } from '../../lib/billing';
import { getItBudget } from '../../lib/db';
import BudgetDashboard from './BudgetDashboard';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
    const billingData = await fetchBillingData();
    const itBudget = await getItBudget();
    const calculatedM365RunRate = billingData.calculatedM365RunRate;
    const azureRunRate = billingData.secondaryCost;

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
                    <BudgetDashboard 
                        initialBudget={itBudget as any} 
                        m365RunRate={calculatedM365RunRate} 
                        azureRunRate={azureRunRate} 
                        billingRegions={billingData.regions || []}
                    />
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
