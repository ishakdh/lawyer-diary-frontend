import { useState, useEffect } from 'react';

export default function TopUpModal({ onClose, onSuccessfulTopUp }) {
    const [gateways, setGateways] = useState([]);
    const [selectedGateway, setSelectedGateway] = useState(null);
    const [senderNumber, setSenderNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [trxId, setTrxId] = useState('');
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(false);

    useEffect(() => {
        fetchGateways();
    }, []);

    const fetchGateways = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            // FIX: Add /payment prefix (or verify how your server.js mounts paymentRoutes)
            const res = await fetch('/api/payment/gateways', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch from backend');

            const data = await res.json();

            if (data.success && data.gateways) {
                setGateways(data.gateways);
                setApiError(false);
            } else {
                setGateways([]);
            }
        } catch (err) {
            console.error('Failed to load gateways:', err);
            setApiError(true);
            setGateways([]);
        }
    };

    const handleClaim = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/wallet/topup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    gateway_id: selectedGateway.id,
                    provider: selectedGateway.provider,
                    account_type: selectedGateway.account_type,
                    account_number: selectedGateway.account_number,
                    sender_number: senderNumber,
                    amount: amount,
                    trx_id: trxId
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Top-up claim submitted successfully!');
                onSuccessfulTopUp();
                onClose();
            } else {
                alert(data.message || 'Failed to submit top-up request.');
            }
        } catch (err) {
            alert('Server error while submitting top-up.');
        }
        setLoading(false);
    };

    const isBkash = selectedGateway?.provider?.toLowerCase().includes('bkash');
    const brandColor = isBkash ? 'bg-[#e2136e]' : 'bg-[#ec1c24]';
    const brandName = isBkash ? 'bkash' : 'nagad';
    const isMerchant = selectedGateway?.account_type?.toLowerCase().includes('merchant');

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {!selectedGateway ? (
                    <div>
                        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold">Top Up Wallet</h3>
                                <p className="text-xs text-slate-400">Select your preferred payment method</p>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
                        </div>

                        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                            {apiError ? (
                                <div className="text-center py-8">
                                    <p className="text-red-500 font-bold text-sm">Server Connection Error</p>
                                    <p className="text-slate-500 text-xs mt-1">Please make sure your backend is running correctly without errors.</p>
                                </div>
                            ) : gateways.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    No active payment gateways found. <br/>Please configure them in your Admin Panel.
                                </div>
                            ) : (
                                gateways.map((g) => {
                                    const isB = g.provider.toLowerCase().includes('bkash');
                                    const logoSrc = isB ? '/bkash.png' : '/nagad.png';

                                    return (
                                        <button
                                            key={g.id}
                                            onClick={() => setSelectedGateway(g)}
                                            className={`w-full p-4 rounded-xl border flex items-center justify-between transition shadow-sm hover:shadow text-left ${
                                                isB ? 'border-pink-200 hover:bg-pink-50' : 'border-orange-200 hover:bg-orange-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">

                                                {/* --- NEW LOGO RENDERER WITH SMART FALLBACK --- */}
                                                <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 shadow-sm bg-white shrink-0 p-1.5 flex items-center justify-center relative">
                                                    <img
                                                        src={logoSrc}
                                                        alt={g.provider}
                                                        className="w-full h-full object-contain absolute inset-0 m-auto p-1.5 z-10"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none'; // Hide broken image
                                                            e.target.nextSibling.style.display = 'flex'; // Show text fallback
                                                        }}
                                                    />
                                                    {/* Fallback Text Circle (Hidden by default, shown if image fails) */}
                                                    <div className="hidden w-full h-full items-center justify-center text-white font-black text-xs rounded-full absolute inset-0 z-0"
                                                         style={{ backgroundColor: isB ? '#e2136e' : '#ec1c24' }}>
                                                        {isB ? 'bK' : 'Ng'}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800">{g.provider}</h4>
                                                    <p className="text-xs font-semibold text-slate-600 mt-0.5">{g.account_type}</p>
                                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{g.account_number}</p>
                                                </div>
                                            </div>
                                            <span className="text-slate-400 font-bold text-base pr-2">➔</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white">
                        <div className={`${brandColor} text-white px-6 py-5 text-center relative shadow-md`}>
                            <button onClick={() => setSelectedGateway(null)} className="absolute left-4 top-4 text-white/90 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                ← Back
                            </button>
                            <button onClick={onClose} className="absolute right-4 top-4 text-white/90 hover:text-white text-xs font-bold uppercase tracking-wider">
                                ✕ Close
                            </button>
                            <h2 className="text-2xl font-black italic tracking-widest uppercase mt-3">{brandName}</h2>
                            <p className="text-[10px] tracking-widest uppercase opacity-90 font-medium mt-0.5">Secure Checkout</p>
                        </div>

                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center text-xs">
                            <div>
                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Target Number</span>
                                <span className="font-mono font-bold text-slate-800 text-sm">{selectedGateway.account_number}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Method</span>
                                <span className={`font-bold uppercase tracking-wider text-[11px] ${isBkash ? 'text-[#e2136e]' : 'text-[#ec1c24]'}`}>
                                    {selectedGateway.provider} {isMerchant ? 'MERCHANT' : 'PERSONAL'}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleClaim} className="p-6 space-y-4">
                            <div className="text-[11px] text-slate-700 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <p className="font-bold text-slate-900 uppercase">
                                    1. Make "{isMerchant ? 'PAYMENT' : 'SEND MONEY'}" to the number above.
                                </p>
                                <p className="text-slate-500">
                                    ১. উপরের নাম্বারে "{isMerchant ? 'পেমেন্ট' : 'সেন্ড মানি'}" করুন।
                                </p>
                                <p className="font-bold text-slate-900 uppercase pt-1">
                                    2. After successfully sending, enter your sender number, amount & Transaction ID.
                                </p>
                                <p className="text-slate-500">
                                    ২. সফলভাবে পাঠানোর পর নিচের বক্সে নাম্বার, অ্যামাউন্ট ও ট্রানজ্যাকশন আইডি প্রদান করুন।
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <input required type="tel" placeholder="e.g. 017XXXXXXXX" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-slate-800 bg-white shadow-sm text-center"/>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center">Sender Account Number</label>
                                </div>
                                <div>
                                    <input required type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-slate-800 bg-white shadow-sm text-center"/>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center">Amount (৳)</label>
                                </div>
                                <div>
                                    <input required type="text" placeholder="E.G. 9J5BQX7T" value={trxId} onChange={(e) => setTrxId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono uppercase outline-none focus:border-slate-800 bg-white shadow-sm text-center"/>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center">Transaction ID</label>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wider uppercase transition shadow-lg ${brandColor} hover:opacity-90 disabled:opacity-50 mt-2`}>
                                {loading ? 'Processing...' : 'Confirm'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}