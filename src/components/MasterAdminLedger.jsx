import { useState, useEffect } from 'react';

export default function MasterAdminDashboard({ onLogout }) {
    const [activeTab, setActiveTab] = useState('financials');
    const [stats, setStats] = useState({ total_users: 0, active_users: 0, inactive_users: 0, platform_wallet_volume: '0.00' });
    const [users, setUsers] = useState([]);

    const [settings, setSettings] = useState({
        default_free_trial_months: '1',
        monthly_subscription_fee: '500',
        annual_subscription_fee: '5000',
        referral_reward_referrer_months: '1',
        referral_reward_referee_months: '1',
        bkash_number: '',
        bkash_type: 'personal',
        nagad_number: '',
        nagad_type: 'personal'
    });

    const [feeSelection, setFeeSelection] = useState({ userId: 'global', monthly: '', annual: '' });
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState('');

    useEffect(() => {
        loadAdminData();
    }, []);

    // Auto-populate fee form when selecting a user or global
    useEffect(() => {
        if (feeSelection.userId === 'global') {
            setFeeSelection(prev => ({
                ...prev,
                monthly: settings.monthly_subscription_fee || '',
                annual: settings.annual_subscription_fee || ''
            }));
        } else {
            const user = users.find(u => u.id === feeSelection.userId);
            if (user) {
                setFeeSelection(prev => ({
                    ...prev,
                    monthly: user.custom_monthly_fee || '',
                    annual: user.custom_annual_fee || ''
                }));
            }
        }
    }, [feeSelection.userId, settings, users]);

    const loadAdminData = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/admin/data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
                setUsers(data.users);
                setSettings(prev => ({ ...prev, ...data.settings }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGateways = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings) // Saves bKash/Nagad configs natively
            });
            const data = await res.json();
            if (data.success) {
                showSuccess('Payment gateways updated successfully!');
            }
        } catch (err) {
            alert('Failed to save gateways.');
        }
    };

    const handleSaveFees = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('lawyer_token');

            if (feeSelection.userId === 'global') {
                // Save as Global Settings
                const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        monthly_subscription_fee: feeSelection.monthly,
                        annual_subscription_fee: feeSelection.annual
                    })
                });
                if ((await res.json()).success) showSuccess('Global default fees updated!');
            } else {
                // Save User-Specific Override
                const res = await fetch(`/api/admin/users/${feeSelection.userId}/fees`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        monthly: feeSelection.monthly,
                        annual: feeSelection.annual
                    })
                });
                if ((await res.json()).success) {
                    showSuccess('Custom user fee applied!');
                    loadAdminData(); // Refresh to get updated user data
                }
            }
        } catch (err) {
            alert('Failed to save fee structure.');
        }
    };

    const showSuccess = (msg) => {
        setActionMsg(msg);
        setTimeout(() => setActionMsg(''), 3000);
    };

    // Mirror User Handler
    const handleMirrorUser = async (userId) => {
        try {
            const adminToken = localStorage.getItem('lawyer_token');
            const res = await fetch(`/api/admin/impersonate/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('admin_token_backup', adminToken);
                localStorage.setItem('lawyer_token', data.token);
                window.location.reload();
            } else {
                alert(data.message || 'Unable to mirror user');
            }
        } catch (err) {
            alert('Error entering mirror mode.');
        }
    };

    const toggleAdmin = async (userId) => {
        const token = localStorage.getItem('lawyer_token');
        await fetch(`/api/admin/users/${userId}/toggle-admin`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadAdminData();
    };

    const toggleActiveStatus = async (userId) => {
        const token = localStorage.getItem('lawyer_token');
        await fetch(`/api/admin/users/${userId}/toggle-status`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadAdminData();
    };

    const deleteUser = async (userId) => {
        if (!window.confirm('Delete this user account completely?')) return;
        const token = localStorage.getItem('lawyer_token');
        await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadAdminData();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
            <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-none">Lawyer Diary</h1>
                        <span className="text-xs text-slate-400">Master Control Panel</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full">
            Active Master Admin
          </span>
                    <button onClick={onLogout} className="bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition">
                        Admin Logout
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-8 space-y-6">
                {actionMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-sm font-medium">
                        {actionMsg}
                    </div>
                )}

                {/* Global Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Lawyers</span>
                        <div className="text-3xl font-bold mt-2 text-white">{loading ? '...' : stats.total_users}</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Subscriptions</span>
                        <div className="text-3xl font-bold mt-2 text-emerald-400">{loading ? '...' : stats.active_users}</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Expired / Inactive</span>
                        <div className="text-3xl font-bold mt-2 text-rose-400">{loading ? '...' : stats.inactive_users}</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Platform Volume</span>
                        <div className="text-3xl font-bold mt-2 text-blue-400">৳{loading ? '...' : Number(stats.platform_wallet_volume || 0).toFixed(2)}</div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-2 border-b border-slate-700 pb-2">
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        👥 User Management & Mirror
                    </button>
                    <button onClick={() => setActiveTab('financials')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'financials' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        💳 Fees & Payment Gateways
                    </button>
                    <button onClick={() => setActiveTab('referrals')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'referrals' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        🎁 Referral Architecture
                    </button>
                </div>

                {/* TAB 1: USERS & MIRROR */}
                {activeTab === 'users' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow">
                        <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="font-bold text-white text-base">Registered Lawyers & Secondary Admins</h2>
                            <span className="text-xs text-slate-400">Use Mirror Action to manage workspace on user's behalf</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                                    <th className="p-4">Name / Phone</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Access Status</th>
                                    <th className="p-4">Referrals</th>
                                    <th className="p-4">Expires</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-750/50 transition">
                                        <td className="p-4">
                                            <div className="font-medium text-white">{u.full_name}</div>
                                            <div className="text-xs text-slate-400">{u.phone_number}</div>
                                        </td>
                                        <td className="p-4">
                                            {u.is_admin ? (
                                                <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs border border-amber-500/30">Master Admin</span>
                                            ) : (
                                                <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">Advocate</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                                        </td>
                                        <td className="p-4 font-medium text-purple-300">{u.total_referrals} Invites</td>
                                        <td className="p-4 text-xs text-slate-300">{new Date(u.trial_ends_at).toLocaleDateString('en-GB')}</td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={() => handleMirrorUser(u.id)} className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1 rounded text-xs transition border border-indigo-500/30">
                                                🪞 Mirror
                                            </button>
                                            <button onClick={() => toggleAdmin(u.id)} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded text-xs transition">
                                                {u.is_admin ? 'Demote' : 'Promote'}
                                            </button>
                                            <button onClick={() => toggleActiveStatus(u.id)} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded text-xs transition">
                                                {u.is_active ? 'Disable' : 'Enable'}
                                            </button>
                                            <button onClick={() => deleteUser(u.id)} className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-2.5 py-1 rounded text-xs transition">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: FINANCIALS & PAYMENT GATEWAYS */}
                {activeTab === 'financials' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* PART A: FEE MANAGEMENT */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow">
                            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3 mb-5">Billing & Fee Structure</h2>
                            <form onSubmit={handleSaveFees} className="space-y-4">

                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Target Account</label>
                                    <select
                                        value={feeSelection.userId}
                                        onChange={e => setFeeSelection({...feeSelection, userId: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 font-medium"
                                    >
                                        <option value="global">- Global Default -</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.full_name} ({u.phone_number})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Monthly Fee (৳)</label>
                                        <input
                                            type="number"
                                            value={feeSelection.monthly}
                                            onChange={e => setFeeSelection({...feeSelection, monthly: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                                            placeholder="e.g. 500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Annual Fee (৳)</label>
                                        <input
                                            type="number"
                                            value={feeSelection.annual}
                                            onChange={e => setFeeSelection({...feeSelection, annual: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                                            placeholder="e.g. 5000"
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition shadow mt-2">
                                    {feeSelection.userId === 'global' ? 'Save Global Default Fees' : 'Assign Custom Fee to User'}
                                </button>
                            </form>
                        </div>

                        {/* PART B: GATEWAY INTEGRATION */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow">
                            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3 mb-5">Payment Gateways</h2>
                            <form onSubmit={handleSaveGateways} className="space-y-4">

                                {/* bKash Block */}
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                    <h3 className="text-pink-400 font-bold mb-3 flex items-center gap-2 text-sm">
                                        <span className="w-2 h-2 rounded-full bg-pink-500"></span> bKash Configuration
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Account Number</label>
                                            <input
                                                type="text"
                                                value={settings.bkash_number || ''}
                                                onChange={e => setSettings({ ...settings, bkash_number: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-pink-500 text-sm"
                                                placeholder="017XXXXXXXX"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Account Type</label>
                                            <select
                                                value={settings.bkash_type || 'personal'}
                                                onChange={e => setSettings({ ...settings, bkash_type: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-pink-500 text-sm"
                                            >
                                                <option value="personal">Personal (Send Money)</option>
                                                <option value="merchant">Merchant (Make Payment)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Nagad Block */}
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                    <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2 text-sm">
                                        <span className="w-2 h-2 rounded-full bg-orange-500"></span> Nagad Configuration
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Account Number</label>
                                            <input
                                                type="text"
                                                value={settings.nagad_number || ''}
                                                onChange={e => setSettings({ ...settings, nagad_number: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500 text-sm"
                                                placeholder="018XXXXXXXX"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Account Type</label>
                                            <select
                                                value={settings.nagad_type || 'personal'}
                                                onChange={e => setSettings({ ...settings, nagad_type: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500 text-sm"
                                            >
                                                <option value="personal">Personal (Send Money)</option>
                                                <option value="merchant">Merchant (Make Payment)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-lg transition shadow mt-2">
                                    Save Gateway Numbers & Types
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* TAB 3: REFERRALS */}
                {activeTab === 'referrals' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow max-w-2xl">
                        <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3 mb-5">Dual-Sided Referral Matrix</h2>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const token = localStorage.getItem('lawyer_token');
                            await fetch('/api/admin/settings', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({
                                    default_free_trial_months: settings.default_free_trial_months,
                                    referral_reward_referrer_months: settings.referral_reward_referrer_months,
                                    referral_reward_referee_months: settings.referral_reward_referee_months
                                })
                            });
                            showSuccess('Referral rules updated!');
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Default Free Trial For New Signups (Months)</label>
                                <input type="number" value={settings.default_free_trial_months || ''} onChange={e => setSettings({ ...settings, default_free_trial_months: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Benefit to Referrer (Months Added)</label>
                                    <input type="number" value={settings.referral_reward_referrer_months || ''} onChange={e => setSettings({ ...settings, referral_reward_referrer_months: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Benefit to Joining User (Extra Months)</label>
                                    <input type="number" value={settings.referral_reward_referee_months || ''} onChange={e => setSettings({ ...settings, referral_reward_referee_months: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition shadow mt-2">
                                Update Referral Rules
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}