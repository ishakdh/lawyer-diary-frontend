import { useState, useEffect, useMemo } from 'react';

export default function SubscriptionModal({ onClose, cases }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Calculate unique active clients from the Dashboard cases state
    const activeClientCount = useMemo(() => {
        const uniqueClients = new Set(cases.filter(c => !c.is_closed).map(c => c.client_name.trim().toLowerCase()));
        return uniqueClients.size;
    }, [cases]);

    useEffect(() => {
        const fetchWallet = async () => {
            try {
                const res = await fetch('/api/wallet', { headers: { 'Authorization': `Bearer ${localStorage.getItem('lawyer_token')}` }});
                const result = await res.json();
                if (result.success) setData(result);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchWallet();
    }, []);

    if (loading) return null;

    // Determine current tier
    const currentTier = data.subscription_tiers?.find(tier => {
        const match = tier.name.match(/(\d+)\s*-\s*(\d+)/);
        if (match) {
            const min = parseInt(match[1]);
            const max = parseInt(match[2]);
            return activeClientCount >= min && activeClientCount <= max;
        }
        return false;
    }) || data.subscription_tiers?.[data.subscription_tiers.length - 1] || { name: 'Unknown', monthly: '0' };

    const isExpired = new Date(data.trial_ends_at) < new Date();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
                    <h3 className="font-bold">Subscription & Billing</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Status Card */}
                    <div className={`p-5 rounded-xl border mb-6 flex justify-between items-center ${isExpired ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Account Status</p>
                            <h4 className={`text-xl font-black ${isExpired ? 'text-red-600' : 'text-emerald-600'}`}>
                                {isExpired ? 'EXPIRED' : 'ACTIVE'}
                            </h4>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Valid Until</p>
                            <p className="font-bold text-slate-800">{new Date(data.trial_ends_at).toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>

                    {/* Plan Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Your Active Clients</p>
                            <p className="text-2xl font-black text-slate-800">{activeClientCount}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Current Plan Tier</p>
                            <p className="text-xl font-black text-blue-700">{currentTier.name}</p>
                            <p className="text-xs font-semibold text-blue-600 mt-1">৳{currentTier.monthly} / month</p>
                        </div>
                    </div>

                    {/* Payment History */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">Recharge History</h4>
                        {data.transactions.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No payment history available.</p>
                        ) : (
                            <div className="space-y-3">
                                {data.transactions.map((tx, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800">{tx.description}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.created_at).toLocaleString('en-GB')}</p>
                                        </div>
                                        <span className="font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded text-xs">+ ৳{tx.amount}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}