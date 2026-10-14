import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import MasterAdminDashboard from './MasterAdminDashboard';

const parseJwt = (token) => {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch (e) { return null; }
};

export default function App() {
  // Define the API Base URL from your Coolify environment variables
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const token = localStorage.getItem('lawyer_token');
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);
  const [isAdmin, setIsAdmin] = useState(false);
  const [referredByCode, setReferredByCode] = useState('');

  useEffect(() => {
    if (token) {
      const decoded = parseJwt(token);
      setIsAdmin(decoded?.is_admin || false);
    }
  }, [token]);

  // View state added: 'signup_verify'
  const [view, setView] = useState('signin');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('lawyer_token');
    setIsLoggedIn(false);
    setIsAdmin(false);
    setView('signin');
    setPhone('');
    setPassword('');
    setReferredByCode('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('lawyer_token', data.token);

        // --- Save the lawyer's name ---
        if (data.user && data.user.full_name) {
          localStorage.setItem('lawyer_name', data.user.full_name);
        }

        const decoded = parseJwt(data.token);
        setIsAdmin(decoded?.is_admin || false);
        setIsLoggedIn(true);
      } else { setError(data.message || 'Invalid phone or password.'); }
    } catch (err) { setError('Server error during sign in.'); }
    setLoading(false);
  };

  // REGISTER - STEP 1: Request OTP
  const handleSignUpRequest = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          password,
          address,
          auto_sms_enabled: autoSms,
          referred_by_code: referredByCode // <--- Added Promo/Referral Code to payload
        }),
      });
      const data = await res.json();
      if (data.success) {
        setView('signup_verify');
      } else { setError(data.message || 'Registration failed.'); }
    } catch (err) { setError('Server error requesting registration.'); }
    setLoading(false);
  };

  // REGISTER - STEP 2: Verify OTP
  const handleSignUpVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp_code: otp }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Account verified successfully! Please sign in.');
        setTimeout(() => {
          setSuccessMsg('');
          setOtp('');
          setView('signin');
        }, 1500);
      } else { setError(data.message || 'Invalid OTP.'); }
    } catch (err) { setError('Server error verifying registration.'); }
    setLoading(false);
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) setView('forgot_verify');
      else setError(data.message || 'Phone number not found.');
    } catch (err) { setError('Server error requesting password reset.'); }
    setLoading(false);
  };

  const handleForgotVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp_code: otp }),
      });
      const data = await res.json();
      if (data.success) setView('forgot_reset');
      else setError(data.message || 'Invalid or expired OTP.');
    } catch (err) { setError('Server error verifying OTP.'); }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Password updated successfully! Please log in.');
        setTimeout(() => {
          setSuccessMsg('');
          setPassword('');
          setNewPassword('');
          setView('signin');
        }, 1500);
      } else { setError(data.message || 'Failed to update password.'); }
    } catch (err) { setError('Server error resetting password.'); }
    setLoading(false);
  };

  if (isLoggedIn) {
    if (isAdmin) return <MasterAdminDashboard onLogout={handleLogout} />;
    return <Dashboard onLogout={handleLogout} />;
  }

  return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Lawyer Diary</h1>
            <p className="text-slate-500 text-sm mt-1">
              {view === 'signin' && 'Sign In to Your Workspace'}
              {view === 'signup' && 'Create New Advocate Account'}
              {view === 'terms' && 'Legal Agreement & Terms'}
              {view === 'signup_verify' && 'Verify WhatsApp OTP'}
              {(view === 'forgot_phone' || view === 'forgot_verify' || view === 'forgot_reset') && 'Reset Password'}
            </p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}
          {successMsg && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4 border border-green-200">{successMsg}</div>}

          {/* SIGN IN VIEW */}
          {view === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="text" placeholder="017XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
                <div className="flex justify-between items-center text-sm pt-2">
                  <button type="button" onClick={() => { setView('signup'); setError(''); }} className="text-blue-600 hover:underline font-medium">Signup New User</button>
                  <button type="button" onClick={() => { setView('forgot_phone'); setError(''); }} className="text-slate-500 hover:underline">Forget Password?</button>
                </div>
              </form>
          )}

          {/* SIGN UP REQUEST VIEW */}
          {view === 'signup' && (
              <form onSubmit={handleSignUpRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input type="text" placeholder="Advocate Rahim" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input type="text" placeholder="017XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chamber Address</label>
                  <input type="text" placeholder="Supreme Court Bar Association, Dhaka" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" />
                </div>

                {/* --- NEW REFERRAL/PROMO CODE FIELD --- */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Referral / Promo Code (Optional)</label>
                  <input
                      type="text"
                      placeholder="e.g. A1B2C3 or VICTORY2026"
                      value={referredByCode}
                      onChange={(e) => setReferredByCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase"
                  />
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                      type="checkbox"
                      id="agreedToTerms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 mt-1 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                      required
                  />
                  <label htmlFor="agreedToTerms" className="text-sm text-slate-700 leading-snug">
                    I have read and agree to the{' '}
                    <button
                        type="button"
                        onClick={() => { setView('terms'); setError(''); }}
                        className="text-blue-600 font-bold hover:underline hover:text-blue-800"
                    >
                      Terms of Service & Data Security Agreement
                    </button>.
                  </label>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-medium py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50 mt-2">
                  {loading ? 'Sending OTP...' : 'Register Account'}
                </button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => { setView('signin'); setError(''); }} className="text-sm text-blue-600 hover:underline font-medium">Already have an account? Sign In</button>
                </div>
              </form>
          )}

          {/* TERMS AND AGREEMENT VIEW */}
          {view === 'terms' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="max-h-64 overflow-y-auto p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3 text-xs leading-relaxed text-slate-700 shadow-inner">
                  <h3 className="font-black text-sm text-slate-900 mb-2 border-b pb-2 uppercase tracking-wide">Lawyer Diary – Terms of Service</h3>
                  <p><strong>1. Data Security & Risks:</strong> We employ industry-standard security measures and regular backups. However, by using the Platform, you acknowledge that Lawyer Diary is not legally or financially liable for data breaches, data loss, or system corruption caused by malicious cyberattacks or catastrophic hardware failures.</p>
                  <p><strong>2. Service Availability:</strong> Lawyer Diary is provided on an "as-is" basis. We are not responsible for any professional, legal, or financial losses you may incur due to unexpected server crashes or network disruptions.</p>
                  <p><strong>3. User Responsibility for Data Backups:</strong> Lawyer Diary operates as a day-to-day case management utility, not a permanent archiving service. You agree to maintain independent backups of all critical case documents.</p>
                  <p><strong>4. Limitation of Liability:</strong> In no event shall Lawyer Diary be liable for any indirect, incidental, or special damages arising out of your use of the Platform.</p>
                  <p><strong>5. Account Suspension:</strong> We reserve the right to suspend or terminate accounts in the event of non-payment or violation of these terms.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setView('signup')}
                    className="w-full bg-slate-800 text-white font-bold tracking-wider py-3 rounded-lg hover:bg-slate-900 transition shadow-md"
                >
                  ← Back to Registration
                </button>
              </div>
          )}

          {/* SIGN UP VERIFY VIEW */}
          {view === 'signup_verify' && (
              <form onSubmit={handleSignUpVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enter 6-Digit OTP sent to {phone}</label>
                  <input type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-center tracking-widest text-lg" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-medium py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
                  {loading ? 'Verifying...' : 'Verify OTP & Create Account'}
                </button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => { setView('signup'); setError(''); }} className="text-sm text-slate-500 hover:text-slate-800">← Back to Registration</button>
                </div>
              </form>
          )}

          {/* FORGOT PASSWORD: STEP 1 */}
          {view === 'forgot_phone' && (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enter Your Phone Number</label>
                  <input type="text" placeholder="017XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                  {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                </button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => { setView('signin'); setError(''); }} className="text-sm text-slate-500 hover:text-slate-800">← Back to Sign In</button>
                </div>
              </form>
          )}

          {/* FORGOT PASSWORD: STEP 2 */}
          {view === 'forgot_verify' && (
              <form onSubmit={handleForgotVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enter 6-Digit OTP sent to phone</label>
                  <input type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-center tracking-widest text-lg" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-medium py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => { setView('signin'); setError(''); }} className="text-sm text-slate-500 hover:text-slate-800">← Cancel</button>
                </div>
              </form>
          )}

          {/* FORGOT PASSWORD: STEP 3 */}
          {view === 'forgot_reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enter New Password</label>
                  <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
          )}

        </div>
      </div>
  );
}