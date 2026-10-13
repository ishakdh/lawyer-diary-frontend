import { useState, useEffect } from 'react';

export default function Register({ onNavigateToLogin }) {
    const [step, setStep] = useState(1); // Step 1: Form, Step 2: OTP Verification

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        referred_by_code: '',
        auto_sms_enabled: false
    });

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // --- NEW: Auto-fill referral code from URL on load ---
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');

        if (refCode) {
            setFormData(prevData => ({
                ...prevData,
                referred_by_code: refCode
            }));
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Step 1: Submit initial details and request OTP
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // FIX: Added API_BASE so the frontend connects to the backend correctly
            const API_BASE = import.meta.env.VITE_API_URL || 'https://server.lawyer.trvnx.com';

            // NOTE: Ensure this matches your backend route (e.g. /register-request vs /send-otp)
            const response = await fetch(`${API_BASE}/api/auth/register-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData) // Sent full form data instead of just phone/email
            });
            const data = await response.json();

            if (data.success) {
                setStep(2); // Move to OTP screen
            } else {
                setError(data.message || 'Failed to send OTP.');
            }
        } catch (err) {
            setError('Server error requesting OTP. Please check your connection.');
        }
        setLoading(false);
    };

    // Step 2: Verify OTP and finalize registration
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'https://server.lawyer.trvnx.com';

            // NOTE: Ensure this matches your backend route
            const response = await fetch(`${API_BASE}/api/auth/register-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formData.phone, otp_code: otp })
            });
            const data = await response.json();

            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.message || 'Invalid OTP. Please try again.');
            }
        } catch (err) {
            setError('Server error verifying OTP.');
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-slate-200">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Aboard!</h2>
                    <p className="text-slate-600 mb-6">Your Lawyer Diary workspace is ready. Your free trial has been activated.</p>
                    <button onClick={onNavigateToLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition">
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="text-center text-3xl font-extrabold text-slate-900">Create your workspace</h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Or <button onClick={onNavigateToLogin} className="font-medium text-blue-600 hover:text-blue-500">sign in to your existing account</button>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl border border-slate-200 sm:rounded-xl sm:px-10">

                    {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 mb-4">{error}</div>}

                    {step === 1 ? (
                        <form className="space-y-5" onSubmit={handleRequestOtp}>
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                                    <input required name="full_name" type="text" value={formData.full_name} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                                    <input required name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                                        <input required name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" placeholder="01XXXXXXXXX" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                                        <input required name="password" type="password" value={formData.password} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-200" />

                            {/* SaaS Onboarding Questions */}
                            <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-800">Workspace Setup</h3>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Referral Code (Optional)</label>
                                    <p className="text-xs text-slate-500 mb-2">Have a code? Enter it to get an extra month free!</p>
                                    <input name="referred_by_code" type="text" placeholder="e.g. LAW-A1B2C3" value={formData.referred_by_code} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none uppercase" />
                                </div>

                                <div className="flex items-start mt-4">
                                    <div className="flex items-center h-5">
                                        <input id="auto_sms" name="auto_sms_enabled" type="checkbox" checked={formData.auto_sms_enabled} onChange={handleInputChange} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor="auto_sms" className="font-medium text-slate-700">Enable Automated SMS Reminders?</label>
                                        <p className="text-slate-500 text-xs">If checked, the system will automatically send background SMS to your clients 2 days before hearings (Cost: 2.00 ৳ per SMS, deducted from wallet).</p>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition">
                                {loading ? 'Sending OTP...' : 'Next: Verify Phone'}
                            </button>
                        </form>
                    ) : (
                        <form className="space-y-5" onSubmit={handleVerifyOtp}>
                            <div className="text-center mb-6">
                                <div className="text-4xl mb-2">📱</div>
                                <h3 className="text-lg font-bold text-slate-800">Verify your phone</h3>
                                <p className="text-sm text-slate-500">We sent a 6-digit code to <span className="font-medium text-slate-700">{formData.phone}</span></p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 text-center">Enter OTP</label>
                                <input
                                    required
                                    type="text"
                                    maxLength="6"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                                    placeholder="------"
                                />
                            </div>

                            <button type="submit" disabled={loading || otp.length < 6} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition">
                                {loading ? 'Verifying...' : 'Complete Registration'}
                            </button>

                            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-slate-500 hover:text-slate-700 mt-2">
                                Back to form
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}