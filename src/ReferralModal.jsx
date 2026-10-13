import { useState, useEffect } from 'react';

export default function ReferralModal({ onClose }) {
    const [referralData, setReferralData] = useState({
        referral_code: '',
        total_referred: 0,
        shareable_link: ''
    });
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchReferralStats();
    }, []);

    const fetchReferralStats = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            // FIX: Added the critical API_BASE_URL fallback so it hits your actual backend server
            const API_BASE = import.meta.env.VITE_API_URL || 'https://server.lawyer.trvnx.com';

            const res = await fetch(`${API_BASE}/api/wallet/referral-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setReferralData({
                    referral_code: data.referral_code || 'N/A',
                    total_referred: data.total_referred || 0,
                    shareable_link: data.shareable_link || ''
                });
            }
        } catch (err) {
            console.error('Failed to load referral stats.', err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!referralData.shareable_link) return;
        navigator.clipboard.writeText(referralData.shareable_link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold">Invite & Earn Free Months</h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white text-xl font-bold">&times;</button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-xs text-purple-900 space-y-1">
                        <p className="font-bold">How it works:</p>
                        <p>Share your unique link with fellow lawyers. When they sign up using your code, <strong className="text-purple-700">both of you get 1 Month Free</strong> added to your subscription trial!</p>
                    </div>

                    {loading ? (
                        <div className="text-center py-6 text-slate-400 text-sm animate-pulse">Loading referral data...</div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Your Unique Referral Code</label>
                                <div className="bg-slate-100 px-4 py-3 rounded-xl font-mono text-lg font-black tracking-widest text-center text-purple-600 border border-slate-200">
                                    {referralData.referral_code}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Shareable Link</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={referralData.shareable_link}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-600 outline-none"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        disabled={!referralData.shareable_link}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 disabled:opacity-50"
                                    >
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-700">Total Lawyers Referred:</span>
                                <span className="text-lg font-black text-purple-600">{referralData.total_referred}</span>
                            </div>
                        </div>
                    )}

                    <button onClick={onClose} className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-sm font-medium transition">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}