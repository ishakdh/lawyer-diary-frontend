import { useState, useEffect } from 'react';

export default function PaymentWebhookAdmin() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token'); // Or lawyer_token if super admin
            const API_BASE = import.meta.env.VITE_API_URL || '';

            const res = await fetch(`${API_BASE}/api/admin/payment-webhooks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();
            if (data.success) {
                setLogs(data.logs);
            }
        } catch (err) {
            console.error('Failed to load webhook logs:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        if (!dateRange.start && !dateRange.end) return true;
        const logDate = new Date(log.received_at).toISOString().split('T')[0];
        if (dateRange.start && logDate < dateRange.start) return false;
        if (dateRange.end && logDate > dateRange.end) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-[#090E17] text-slate-300 p-6 font-mono selection:bg-emerald-500/30">

            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-8">
                <h2 className="text-xl font-black tracking-widest text-emerald-400 mb-1">PAYMENT RECEIVE WEBHOOK</h2>
                <p className="text-xs tracking-widest text-slate-500 uppercase">Automated SMS logs for bKash & Nagad</p>
            </div>

            <div className="max-w-7xl mx-auto bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">

                {/* Controls Toolbar */}
                <div className="p-5 border-b border-slate-800 flex flex-wrap justify-between items-end gap-4 bg-[#0F1523]">
                    <div className="flex gap-4">
                        <div>
                            <label className="block text-[10px] text-slate-500 tracking-widest uppercase mb-1.5">Start Date</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                className="bg-[#090E17] border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 tracking-widest uppercase mb-1.5">End Date</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                className="bg-[#090E17] border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={fetchLogs}
                            className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold uppercase tracking-wider rounded transition"
                        >
                            ↻ Sync Data
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-xs font-bold uppercase tracking-wider rounded transition">
                            📄 Download Report
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-[#0B1120] border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-4 font-bold tracking-widest text-slate-500 uppercase">Sender Number</th>
                            <th className="px-6 py-4 font-bold tracking-widest text-slate-500 uppercase">Transaction ID</th>
                            <th className="px-6 py-4 font-bold tracking-widest text-slate-500 uppercase text-center">Gateway</th>
                            <th className="px-6 py-4 font-bold tracking-widest text-slate-500 uppercase text-right">Amount</th>
                            <th className="px-6 py-4 font-bold tracking-widest text-slate-500 uppercase text-center">Status</th>
                            <th className="px-6 py-4 font-bold tracking-widest text-slate-500 uppercase text-right">Received At</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading webhooks...</td></tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No automated logs found.</td></tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-[#161F33] transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-300">{log.sender_number}</td>
                                    <td className="px-6 py-4 font-medium text-blue-400 tracking-wider">{log.transaction_id}</td>
                                    <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] font-bold tracking-wider uppercase rounded">
                                                {log.gateway}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-400 text-sm">
                                        ৳{Number(log.amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {log.status === 'SUCCESS' ? (
                                            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase rounded">
                                                    Success
                                                </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold tracking-wider uppercase rounded">
                                                    Waiting For Req
                                                </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-500 text-[11px]">
                                        {new Date(log.received_at).toLocaleString('en-US', {
                                            month: 'numeric', day: 'numeric', year: 'numeric',
                                            hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
                                        })}
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}