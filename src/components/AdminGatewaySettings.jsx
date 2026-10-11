import { useState, useEffect } from 'react';

export default function AdminGatewaySettings() {
    const [gateways, setGateways] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchGateways();
    }, []);

    const fetchGateways = async () => {
        try {
            const token = localStorage.getItem('admin_token') || localStorage.getItem('lawyer_token');
            const res = await fetch('/api/gateways', { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success && data.gateways) {
                setGateways(data.gateways);
            }
        } catch (err) {
            console.error('Failed to fetch gateways');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setGateways([...gateways, { id: Date.now(), provider: 'bKash', account_number: '', account_type: 'Merchant (Make Payment)' }]);
    };

    const handleRemove = (id) => {
        setGateways(gateways.filter(g => g.id !== id));
    };

    const handleChange = (id, field, value) => {
        setGateways(gateways.map(g => g.id === id ? { ...g, [field]: value } : g));
    };

    const handleSaveAll = async () => {
        setMessage('Saving...');
        try {
            const token = localStorage.getItem('admin_token') || localStorage.getItem('lawyer_token');

            // USING THE NEW GUARANTEED ROUTE HERE!
            const res = await fetch('/api/gateways/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ gateways })
            });

            const data = await res.json();
            if (data.success) {
                setMessage('✅ All payment gateways saved successfully to database!');
                fetchGateways();
            } else {
                setMessage(data.message || 'Failed to save gateways.');
            }
        } catch (err) {
            setMessage('Server error while saving.');
        }
    };

    if (loading) return <div className="p-4 text-center text-slate-400">Loading gateways...</div>;

    return (
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-slate-700 max-w-4xl mx-auto my-6 text-white">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Configured Gateways</h3>
                <button onClick={handleAdd} className="border border-emerald-600 text-emerald-500 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                    + Add Gateway
                </button>
            </div>

            {message && (
                <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${message.includes('✅') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            <div className="space-y-4 mb-6">
                {gateways.length === 0 ? (
                    <div className="text-center p-6 bg-[#0f172a] rounded-xl border border-slate-700 text-slate-400">
                        No gateways configured. Click "+ Add Gateway" to start.
                    </div>
                ) : (
                    gateways.map((g) => (
                        <div key={g.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Provider</label>
                                <select
                                    value={g.provider}
                                    onChange={(e) => handleChange(g.id, 'provider', e.target.value)}
                                    className="w-full bg-[#1e293b] border border-slate-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                                >
                                    <option value="bKash">bKash</option>
                                    <option value="Nagad">Nagad</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Account Number</label>
                                <input
                                    type="text"
                                    value={g.account_number}
                                    onChange={(e) => handleChange(g.id, 'account_number', e.target.value)}
                                    className="w-full bg-[#1e293b] border border-slate-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                                    placeholder="e.g. 017..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Account Type</label>
                                <select
                                    value={g.account_type}
                                    onChange={(e) => handleChange(g.id, 'account_type', e.target.value)}
                                    className="w-full bg-[#1e293b] border border-slate-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                                >
                                    <option value="Merchant (Make Payment)">Merchant (Make Payment)</option>
                                    <option value="Personal (Send Money)">Personal (Send Money)</option>
                                </select>
                            </div>
                            <div>
                                <button onClick={() => handleRemove(g.id)} className="w-full bg-rose-900/40 text-rose-400 hover:bg-rose-900/60 hover:text-rose-300 border border-rose-800/50 py-2.5 rounded-lg text-sm font-medium transition">
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button onClick={handleSaveAll} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition">
                Save All Payment Gateways
            </button>
        </div>
    );
}