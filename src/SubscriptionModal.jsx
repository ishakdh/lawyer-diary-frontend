import { useState, useEffect, useMemo, useCallback } from 'react';

export default function SubscriptionModal({ onClose, cases }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [purchaseLoading, setPurchaseLoading] = useState(false);

    // Calculate unique active clients from the Dashboard cases state
    const activeClientCount = useMemo(() => {
        if (!cases || !Array.isArray(cases)) return 0;
        const uniqueClients = new Set(cases.filter(c => !c.is_closed).map(c => c.client_name.trim().toLowerCase()));
        return uniqueClients.size;
    }, [cases]);

    // Extracted fetch function so we can refresh data after a purchase
    const fetchWalletData = useCallback(async () => {
        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'https://server.lawyer.trvnx.com';
            const res = await fetch(`${API_BASE}/api/wallet`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('lawyer_token')}` }
            });
            const result = await res.json();
            if (result.success) {
                setData(result);
            } else {
                setData(null);
            }
        } catch (err) {
            console.error("Wallet fetch error:", err);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWalletData();
    }, [fetchWalletData]);

    // Handle clicking the "Get" button
    const handlePurchase = async (amount, planType, tierName) => {
        if (!window.confirm(`Confirm purchase of ${tierName} (${planType}ly) for ৳${amount}?`)) return;

        setPurchaseLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'https://server.lawyer.trvnx.com';
            const res = await fetch(`${API_BASE}/api/wallet/purchase-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('lawyer_token')}`
                },
                body: JSON.stringify({ amount, planType, tierName })
            });
            const result = await res.json();

            if (result.success) {
                alert(result.message);
                await fetchWalletData(); // Refresh balance and validity date instantly
            } else {
                alert(result.message); // Will show the "don't have enough balance" error
            }
        } catch (err) {
            alert('An error occurred while processing your request.');
        } finally {
            setPurchaseLoading(false);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl">
                <p className="font-bold text-slate-500 animate-pulse">Loading Subscription Data...</p>
            </div>
        </div>
    );

    if (!data) return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl">
                <p className="font-bold text-red-500 mb-4">Failed to load subscription data.</p>
                <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold">Close</button>
            </div>
        </div>
    );

    // Determine current tier safely
    const currentTier = data.subscription_tiers?.find(tier => {
        const name = tier.name || tier.tier_name || '';
        const match = name.match(/(\d+)\s*-\s*(\d+)/);
        if (match) {
            const min = parseInt(match[1]);
            const max = parseInt(match[2]);
            return activeClientCount >= min && activeClientCount <= max;
        }
        return false;
    }) || data.subscription_tiers?.[(data.subscription_tiers?.length || 1) - 1] || { name: 'Unknown', monthly: '0' };

    const isExpired = new Date(data.trial_ends_at) < new Date();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
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

                    {/* Plan Details & Wallet */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Clients</p>
                            <p className="text-xl font-black text-slate-800">{activeClientCount}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Current Tier</p>
                            <p className="text-lg font-black text-blue-700 truncate">{currentTier.name || currentTier.tier_name}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Wallet Balance</p>
                            <p className="text-xl font-black text-purple-700">৳{Number(data.balance).toFixed(0)}</p>
                        </div>
                    </div>

                    {/* NEW: Subscription Plan Table */}
                    {data.subscription_tiers && data.subscription_tiers.length > 0 && (
                        <div className="mb-8">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">Upgrade Subscription Plan</h4>
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                        <th className="p-3 font-bold">User (Cases)</th>
                                        <th className="p-3 font-bold">Monthly Fee</th>
                                        <th className="p-3 font-bold">Annual Fee</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {data.subscription_tiers.map((t, idx) => {
                                        const tierName = t.name || t.tier_name || 'N/A';
                                        const monthly = parseFloat(t.monthly || t.monthly_price || 0);
                                        const annual = parseFloat(t.annual || t.annual_price || 0);

                                        return (
                                            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                                                <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{tierName}</td>
                                                <td className="p-3">
                                                    {monthly <= 0 ? (
                                                        <span className="text-slate-500 font-bold">Free</span>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-700">৳{monthly}</span>
                                                            <button
                                                                onClick={() => handlePurchase(monthly, 'month', tierName)}
                                                                disabled={purchaseLoading}
                                                                className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded shadow-sm transition disabled:opacity-50"
                                                            >
                                                                Get
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    {annual <= 0 ? (
                                                        <span className="text-slate-500 font-bold">Free</span>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-700">৳{annual}</span>
                                                            <button
                                                                onClick={() => handlePurchase(annual, 'year', tierName)}
                                                                disabled={purchaseLoading}
                                                                className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded shadow-sm transition disabled:opacity-50"
                                                            >
                                                                Get
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Payment History */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">Recharge History</h4>
                        {(!data.transactions || data.transactions.length === 0) ? (
                            <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">No payment history available.</p>
                        ) : (
                            <div className="space-y-3">
                                {data.transactions.map((tx, idx) => {
                                    // Check if it's a deduction (expense) or a recharge (income)
                                    const isDeduction = parseFloat(tx.amount) < 0;
                                    const amountStr = Math.abs(parseFloat(tx.amount)).toFixed(0);

                                    return (
                                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
                                            <div>
                                                <p className="font-bold text-sm text-slate-800">{tx.description}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.created_at).toLocaleString('en-GB')}</p>
                                            </div>
                                            <span className={`font-black px-2 py-1 rounded text-xs ${isDeduction ? 'text-red-600 bg-red-100' : 'text-emerald-600 bg-emerald-100'}`}>
                                                {isDeduction ? '-' : '+'} ৳{amountStr}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}