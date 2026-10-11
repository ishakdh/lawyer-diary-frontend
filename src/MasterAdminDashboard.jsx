import { useState, useEffect } from 'react';

export default function MasterAdminDashboard({ onLogout }) {
    const [activeTab, setActiveTab] = useState('finance');
    const [stats, setStats] = useState({ total_users: 0, active_users: 0, inactive_users: 0, platform_wallet_volume: '0.00' });
    const [users, setUsers] = useState([]);

    // --- Search, Filter, and View Modal State (Lawyers) ---
    const [searchQuery, setSearchQuery] = useState('');
    const [subFilter, setSubFilter] = useState('all'); // 'all' | 'paid' | 'free'
    const [selectedUserDetail, setSelectedUserDetail] = useState(null);

    // --- Admin View/Edit Modal State ---
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [isEditingAdmin, setIsEditingAdmin] = useState(false);
    const [editAdminForm, setEditAdminForm] = useState({ full_name: '', phone: '', permissions: {} });

    // Finance State
    const [financeData, setFinanceData] = useState({ stats: { today: 0, last_15_days: 0, this_month: 0 }, transactions: [] });
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

    // Sub-Admin State
    const [newAdmin, setNewAdmin] = useState({
        full_name: '', phone: '', password: '',
        permissions: {
            finance_ledger: false, user_management: false, user_mirroring: false,
            subscription_plan: false, payment_gateway: false, referral_matrix: false
        }
    });

    const [feeTiers, setFeeTiers] = useState([{ name: '0-10 Users', monthly: '', annual: '' }]);
    const [gateways, setGateways] = useState([{ provider: 'bKash', number: '', type: 'merchant' }]);
    const [settings, setSettings] = useState({
        default_free_trial_months: '1', referral_reward_referrer_months: '1', referral_reward_referee_months: '1'
    });

    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState('');
    const [promoCodes, setPromoCodes] = useState([]);
    const [newPromo, setNewPromo] = useState({ code: '', valid_until: '', free_months: '1' });

    // Global Date Format Helper Functions (Strict DD/MM/YYYY)
    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Never';
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12;
        const formattedTime = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

        return `${day}/${month}/${year}, ${formattedTime}`;
    };

    useEffect(() => {
        loadAdminData();
        loadFinanceData();
        loadPromos();
    }, []);

    const loadPromos = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/admin/promos', { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setPromoCodes(data.promos);
        } catch(e){}
    };


    const loadAdminData = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/admin/data', { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
                setUsers(data.users);
                setSettings(prev => ({ ...prev, ...data.settings }));
                if (data.settings.subscription_tiers) { try { setFeeTiers(JSON.parse(data.settings.subscription_tiers)); } catch(e){} }
                if (data.settings.payment_gateways) { try { setGateways(JSON.parse(data.settings.payment_gateways)); } catch(e){} }
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const loadFinanceData = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            let url = '/api/admin/finance';
            if (dateFilter.start && dateFilter.end) { url += `?start_date=${dateFilter.start}&end_date=${dateFilter.end}`; }
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setFinanceData({ stats: data.stats, transactions: data.transactions });
        } catch (err) { console.error(err); }
    };

    const handleOpenViewModal = async (userId) => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch(`/api/admin/users/${userId}/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setSelectedUserDetail(result);
            }
        } catch (err) {
            console.error('Failed to load user details', err);
        }
    };

    const showSuccess = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

    // --- Update Sub-Admin Handler ---
    const handleUpdateAdmin = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch(`/api/admin/admins/${selectedAdmin.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(editAdminForm)
            });
            const data = await res.json();
            if (data.success) {
                showSuccess('Admin profile updated successfully!');
                setSelectedAdmin(null);
                loadAdminData();
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('Error updating admin profile.');
        }
    };

    const handleSaveTiers = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/admin/settings', {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ subscription_tiers: JSON.stringify(feeTiers) })
            });
            if ((await res.json()).success) showSuccess('Subscription tiers saved successfully!');
        } catch (err) { alert('Failed to save fee tiers.'); }
    };

    const handleSaveGateways = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/admin/settings', {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ payment_gateways: JSON.stringify(gateways) })
            });
            if ((await res.json()).success) showSuccess('Payment gateways saved successfully!');
        } catch (err) { alert('Failed to save gateways.'); }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/admin/create-sub-admin', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newAdmin)
            });
            const data = await res.json();
            if (data.success) {
                showSuccess('Sub-Admin created successfully!');
                setNewAdmin({ full_name: '', phone: '', password: '', permissions: { finance_ledger: false, user_management: false, user_mirroring: false, subscription_plan: false, payment_gateway: false, referral_matrix: false } });
                loadAdminData();
            } else { alert(data.message); }
        } catch (err) { alert('Error creating sub-admin.'); }
    };

    const addTierRow = () => setFeeTiers([...feeTiers, { name: '', monthly: '', annual: '' }]);
    const removeTierRow = (index) => setFeeTiers(feeTiers.filter((_, i) => i !== index));
    const updateTier = (index, field, value) => { const updated = [...feeTiers]; updated[index][field] = value; setFeeTiers(updated); };

    const addGatewayRow = () => setGateways([...gateways, { provider: 'bKash', number: '', type: 'merchant' }]);
    const removeGatewayRow = (index) => setGateways(gateways.filter((_, i) => i !== index));
    const updateGateway = (index, field, value) => { const updated = [...gateways]; updated[index][field] = value; setGateways(updated); };

    const handleMirrorUser = async (userId) => {
        try {
            const adminToken = localStorage.getItem('lawyer_token');
            const res = await fetch(`/api/admin/impersonate/${userId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` }});
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('admin_token_backup', adminToken);
                localStorage.setItem('lawyer_token', data.token);
                window.location.reload();
            } else { alert(data.message); }
        } catch (err) { alert('Error entering mirror mode.'); }
    };

    const toggleActiveStatus = async (userId) => {
        await fetch(`/api/admin/users/${userId}/toggle-status`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${localStorage.getItem('lawyer_token')}` }});
        loadAdminData();
    };

    const deleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this account?')) return;
        await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('lawyer_token')}` }});
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
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full">Active Master Admin</span>
                    <button onClick={onLogout} className="bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition">Admin Logout</button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-8 space-y-6">
                {actionMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-sm font-medium">
                        {actionMsg}
                    </div>
                )}

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
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Platform Volume</span>
                        <div className="text-3xl font-bold mt-2 text-blue-400">৳{loading ? '...' : Number(stats.platform_wallet_volume || 0).toFixed(2)}</div>
                    </div>
                </div>

                <div className="flex gap-2 border-b border-slate-700 pb-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'finance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>📊 Financial Ledger</button>
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>👥 User Management</button>
                    <button onClick={() => setActiveTab('admins')} className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'admins' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>🛡️ Sub-Admins & Roles</button>
                    <button onClick={() => setActiveTab('plans')} className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'plans' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>💳 Subscription Plans</button>
                    <button onClick={() => setActiveTab('gateways')} className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'gateways' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>🏦 Payment Gateways</button>
                    <button onClick={() => setActiveTab('referrals')} className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'referrals' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>🎁 Referral Matrix</button>
                </div>

                {/* TAB: FINANCIAL LEDGER */}
                {activeTab === 'finance' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow text-center">
                                <h3 className="text-slate-400 text-sm font-medium">Income Today</h3>
                                <div className="text-3xl font-bold text-emerald-400 mt-2">৳{Number(financeData.stats.today).toFixed(2)}</div>
                            </div>
                            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow text-center">
                                <h3 className="text-slate-400 text-sm font-medium">Last 15 Days</h3>
                                <div className="text-3xl font-bold text-blue-400 mt-2">৳{Number(financeData.stats.last_15_days).toFixed(2)}</div>
                            </div>
                            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow text-center">
                                <h3 className="text-slate-400 text-sm font-medium">This Month</h3>
                                <div className="text-3xl font-bold text-purple-400 mt-2">৳{Number(financeData.stats.this_month).toFixed(2)}</div>
                            </div>
                        </div>

                        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow">
                            <div className="p-5 border-b border-slate-700 flex flex-wrap justify-between items-center gap-4">
                                <h2 className="font-bold text-white text-base">Subscription Ledger</h2>
                                <div className="flex items-center gap-3">
                                    <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                                    <span className="text-slate-500">to</span>
                                    <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                                    <button onClick={loadFinanceData} className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-sm text-white font-medium transition">Filter</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                    <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Lawyer Details</th>
                                        <th className="p-4">Gateway / Txn ID</th>
                                        <th className="p-4 text-right">Amount Received</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {financeData.transactions.length === 0 ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-slate-500">No transactions found for this period.</td></tr>
                                    ) : financeData.transactions.map((tx, idx) => (
                                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-750/50 transition">
                                            <td className="p-4 text-slate-300">{formatDateTime(tx.created_at)}</td>
                                            <td className="p-4"><div className="font-medium text-white">{tx.full_name}</div><div className="text-xs text-slate-400">{tx.phone_number}</div></td>
                                            <td className="p-4"><span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">{tx.gateway_used}</span> <span className="text-xs text-slate-500 ml-2">{tx.transaction_id}</span></td>
                                            <td className="p-4 text-right font-bold text-emerald-400">৳{Number(tx.amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: SUB-ADMINS & ROLES */}
                {activeTab === 'admins' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow lg:col-span-1 h-fit">
                            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3 mb-5">Create Sub-Admin</h2>
                            <form onSubmit={handleCreateAdmin} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                                    <input type="text" required value={newAdmin.full_name} onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Phone Number (Login ID)</label>
                                    <input type="text" required value={newAdmin.phone} onChange={e => setNewAdmin({...newAdmin, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Password</label>
                                    <input type="password" required value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                </div>

                                <div className="pt-2 border-t border-slate-700">
                                    <label className="block text-sm text-slate-300 font-bold mb-3">Assign Access Roles</label>

                                    <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-slate-300">
                                        <input type="checkbox" checked={newAdmin.permissions.finance_ledger} onChange={e => setNewAdmin({...newAdmin, permissions: {...newAdmin.permissions, finance_ledger: e.target.checked}})} className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600" />
                                        1. Financial Ledger

                                    </label>
                                    <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-slate-300">
                                        <input type="checkbox" checked={newAdmin.permissions.user_management} onChange={e => setNewAdmin({...newAdmin, permissions: {...newAdmin.permissions, user_management: e.target.checked}})} className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600" />
                                        2. User Management
                                    </label>
                                    <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-slate-300">
                                        <input type="checkbox" checked={newAdmin.permissions.user_mirroring} onChange={e => setNewAdmin({...newAdmin, permissions: {...newAdmin.permissions, user_mirroring: e.target.checked}})} className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600" />
                                        3. User Mirroring
                                    </label>
                                    <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-slate-300">
                                        <input type="checkbox" checked={newAdmin.permissions.subscription_plan} onChange={e => setNewAdmin({...newAdmin, permissions: {...newAdmin.permissions, subscription_plan: e.target.checked}})} className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600" />
                                        4. Subscription Plan
                                    </label>
                                    <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-slate-300">
                                        <input type="checkbox" checked={newAdmin.permissions.payment_gateway} onChange={e => setNewAdmin({...newAdmin, permissions: {...newAdmin.permissions, payment_gateway: e.target.checked}})} className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600" />
                                        5. Payment Gateway
                                    </label>
                                    <label className="flex items-center gap-2 mb-4 cursor-pointer text-sm text-slate-300">
                                        <input type="checkbox" checked={newAdmin.permissions.referral_matrix} onChange={e => setNewAdmin({...newAdmin, permissions: {...newAdmin.permissions, referral_matrix: e.target.checked}})} className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-600" />
                                        6. Referral Matrix
                                    </label>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-lg transition shadow">Create Admin Account</button>
                            </form>
                        </div>

                        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow lg:col-span-2">
                            <div className="p-5 border-b border-slate-700"><h2 className="font-bold text-white text-base">Active Administration Team</h2></div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                    <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                                        <th className="p-4 whitespace-nowrap">Admin Profile</th>
                                        <th className="p-4">Assigned Roles</th>
                                        <th className="p-4 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {users.filter(u => u.is_admin).map(admin => (
                                        <tr key={admin.id} className="border-b border-slate-700/50 hover:bg-slate-750/50 transition">
                                            <td className="p-4 align-middle">
                                                <div className="font-medium text-white flex items-center gap-2">
                                                    {admin.full_name}
                                                    {!admin.is_active && <span className="bg-rose-900/50 text-rose-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-rose-800/50">Locked</span>}
                                                </div>
                                                <div className="text-xs text-amber-400">ID: {admin.phone_number}</div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex flex-wrap gap-1">
                                                    {(!admin.admin_permissions || Object.keys(admin.admin_permissions).length === 0) ? (
                                                        <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-rose-500/30">Super Admin (All Access)</span>
                                                    ) : (
                                                        <>
                                                            {admin.admin_permissions.finance_ledger && <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-purple-500/30">Finance</span>}
                                                            {admin.admin_permissions.user_management && <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-blue-500/30">Users</span>}
                                                            {admin.admin_permissions.user_mirroring && <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-indigo-500/30">Mirror</span>}
                                                            {admin.admin_permissions.subscription_plan && <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-emerald-500/30">Plans</span>}
                                                            {admin.admin_permissions.payment_gateway && <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-orange-500/30">Gateways</span>}
                                                            {admin.admin_permissions.referral_matrix && <span className="bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-pink-500/30">Referrals</span>}
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-4 align-middle">
                                                <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAdmin(admin);
                                                            setIsEditingAdmin(false);
                                                            setEditAdminForm({ full_name: admin.full_name, phone: admin.phone_number, permissions: admin.admin_permissions || {} });
                                                        }}
                                                        className="bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white px-2.5 py-1.5 rounded text-xs transition border border-sky-500/30 font-medium"
                                                    >
                                                        View / Edit
                                                    </button>
                                                    <button onClick={() => handleMirrorUser(admin.id)} className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded text-xs transition border border-indigo-500/30 font-medium">
                                                        🪞 Mirror
                                                    </button>
                                                    <button onClick={() => toggleActiveStatus(admin.id)} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1.5 rounded text-xs transition border border-slate-600">
                                                        {admin.is_active ? 'Lock' : 'Unlock'}
                                                    </button>
                                                    <button onClick={() => deleteUser(admin.id)} className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-2.5 py-1.5 rounded text-xs transition border border-rose-500/30 font-medium">
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: USERS */}
                {activeTab === 'users' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow">

                        <div className="p-5 border-b border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="font-bold text-white text-base">Lawyer Database</h2>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <input
                                    type="text"
                                    placeholder="Search by name or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="px-4 py-1.5 text-sm bg-slate-900 border border-slate-600 text-slate-200 rounded-lg outline-none focus:border-blue-500 w-full md:w-64 placeholder-slate-500"
                                />
                                <select
                                    value={subFilter}
                                    onChange={(e) => setSubFilter(e.target.value)}
                                    className="px-4 py-1.5 text-sm bg-slate-900 border border-slate-600 text-slate-200 rounded-lg outline-none focus:border-blue-500"
                                >
                                    <option value="all">All IDs</option>
                                    <option value="paid">Subscribed ID (Paid)</option>
                                    <option value="free">Unsubscribed ID (Free)</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                                    <th className="p-4">Name / Phone</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Referrals</th>
                                    <th className="p-4">Expires</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {users
                                    .filter(u => {
                                        if (u.is_admin) return false;

                                        const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            u.phone_number?.includes(searchQuery);
                                        const isPaid = new Date(u.trial_ends_at) > new Date();
                                        const matchesSub = subFilter === 'all' ? true :
                                            subFilter === 'paid' ? isPaid : !isPaid;

                                        return matchesSearch && matchesSub;
                                    })
                                    .map(u => {
                                        const isPaid = new Date(u.trial_ends_at) > new Date();
                                        return (
                                            <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-750/50 transition">
                                                <td className="p-4"><div className="font-medium text-white">{u.full_name}</div><div className="text-xs text-slate-400">{u.phone_number}</div></td>
                                                <td className="p-4"><span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">Advocate</span></td>
                                                <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{u.is_active ? 'Active' : 'Locked'}</span></td>
                                                <td className="p-4 font-medium text-purple-300">{u.total_referrals}</td>
                                                <td className="p-4 text-xs text-slate-300">{formatDate(u.trial_ends_at)}</td>

                                                <td className="p-4 flex items-center justify-end space-x-2">

                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isPaid ? 'bg-blue-900/50 text-blue-400 border border-blue-800' : 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                                                    {isPaid ? 'Paid ID' : 'Free ID'}
                                                </span>

                                                    <button onClick={() => handleOpenViewModal(u.id)} className="bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white px-2.5 py-1 rounded text-xs transition border border-sky-500/30">
                                                        View
                                                    </button>

                                                    <button onClick={() => handleMirrorUser(u.id)} className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 px-2.5 py-1 rounded text-xs transition border border-indigo-500/30">🪞 Mirror</button>
                                                    <button onClick={() => toggleActiveStatus(u.id)} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded text-xs transition">{u.is_active ? 'Lock' : 'Unlock'}</button>
                                                    <button onClick={() => deleteUser(u.id)} className="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-2.5 py-1 rounded text-xs transition border border-rose-500/30">Delete</button>
                                                </td>
                                            </tr>
                                        )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB: SUBSCRIPTION PLANS */}
                {activeTab === 'plans' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow max-w-4xl">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
                            <h2 className="text-lg font-bold text-white">Dynamic Fee Tiers</h2>
                            <button onClick={addTierRow} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm transition">+ Add New Tier</button>
                        </div>

                        <form onSubmit={handleSaveTiers} className="space-y-4">
                            {feeTiers.map((tier, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-end bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                    <div className="col-span-4">
                                        <label className="block text-xs text-slate-400 mb-1">Tier Name (e.g. 0-10 Users)</label>
                                        <input type="text" value={tier.name} onChange={(e) => updateTier(index, 'name', e.target.value)} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs text-slate-400 mb-1">Monthly Fee (৳)</label>
                                        <input type="number" value={tier.monthly} onChange={(e) => updateTier(index, 'monthly', e.target.value)} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs text-slate-400 mb-1">Annual Fee (৳)</label>
                                        <input type="number" value={tier.annual} onChange={(e) => updateTier(index, 'annual', e.target.value)} required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                    </div>
                                    <div className="col-span-2 pb-1">
                                        <button type="button" onClick={() => removeTierRow(index)} className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white py-2 rounded-lg text-sm transition">Remove</button>
                                    </div>
                                </div>
                            ))}
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition shadow mt-4">
                                Save All Subscription Plans
                            </button>
                        </form>
                    </div>
                )}

                {/* TAB: PAYMENT GATEWAYS */}
                {activeTab === 'gateways' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow max-w-4xl">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
                            <h2 className="text-lg font-bold text-white">Configured Gateways</h2>
                            <button onClick={addGatewayRow} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-3 py-1.5 rounded-lg text-sm transition">+ Add Gateway</button>
                        </div>

                        <form onSubmit={handleSaveGateways} className="space-y-4">
                            {gateways.map((gw, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-end bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                    <div className="col-span-3">
                                        <label className="block text-xs text-slate-400 mb-1">Provider</label>
                                        <select value={gw.provider} onChange={(e) => updateGateway(index, 'provider', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 text-sm">
                                            <option value="bKash">bKash</option>
                                            <option value="Nagad">Nagad</option>
                                            <option value="Rocket">Rocket</option>
                                            <option value="Upay">Upay</option>
                                        </select>
                                    </div>
                                    <div className="col-span-4">
                                        <label className="block text-xs text-slate-400 mb-1">Account Number</label>
                                        <input type="text" value={gw.number} onChange={(e) => updateGateway(index, 'number', e.target.value)} required placeholder="01XXXXXXXXX" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 text-sm" />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs text-slate-400 mb-1">Account Type</label>
                                        <select value={gw.type} onChange={(e) => updateGateway(index, 'type', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 text-sm">
                                            <option value="personal">Personal (Send Money)</option>
                                            <option value="merchant">Merchant (Make Payment)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 pb-1">
                                        <button type="button" onClick={() => removeGatewayRow(index)} className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white py-2 rounded-lg text-sm transition">Remove</button>
                                    </div>
                                </div>
                            ))}
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition shadow mt-4">
                                Save All Payment Gateways
                            </button>
                        </form>
                    </div>
                )}

                {/* TAB: REFERRALS & PROMO CODES */}
                {activeTab === 'referrals' && (
                    <div className="space-y-6">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow max-w-2xl">
                            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3 mb-5">Referral Incentive Matrix</h2>
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
                                        <label className="block text-sm text-slate-300 mb-1">Referrer Benefit (Months Added)</label>
                                        <input type="number" value={settings.referral_reward_referrer_months || ''} onChange={e => setSettings({ ...settings, referral_reward_referrer_months: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Joining User Benefit (Extra Months)</label>
                                        <input type="number" value={settings.referral_reward_referee_months || ''} onChange={e => setSettings({ ...settings, referral_reward_referee_months: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition shadow mt-2">
                                    Update Referral Rules
                                </button>
                            </form>
                        </div>

                        {/* --- PROMOTIONAL CAMPAIGN CODES --- */}
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow max-w-2xl">
                            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-3 mb-5">Promotional Campaign Codes</h2>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const token = localStorage.getItem('lawyer_token');
                                const res = await fetch('/api/admin/promos', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify(newPromo)
                                });
                                if ((await res.json()).success) {
                                    showSuccess('Promo Code Created!');
                                    setNewPromo({ code: '', valid_until: '', free_months: '1' });
                                    loadPromos();
                                }
                            }} className="flex items-end gap-3 mb-6">
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-400 mb-1">Promo Code</label>
                                    <input type="text" required placeholder="e.g. VICTORY2026" value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 uppercase text-sm" />
                                </div>
                                <div className="w-32">
                                    <label className="block text-xs text-slate-400 mb-1">Valid Until</label>
                                    <input type="date" required value={newPromo.valid_until} onChange={e => setNewPromo({...newPromo, valid_until: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs text-slate-400 mb-1">Free Months</label>
                                    <input type="number" required min="1" value={newPromo.free_months} onChange={e => setNewPromo({...newPromo, free_months: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm text-white font-medium transition h-[38px]">+ Add</button>
                            </form>

                            <div className="space-y-2">
                                {promoCodes.map(promo => (
                                    <div key={promo.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                                        <div>
                                            <span className="font-bold text-emerald-400 text-lg mr-3">{promo.code}</span>
                                            <span className="text-slate-400 text-xs">Valid until: {formatDate(promo.valid_until)}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-600">+{promo.free_months} Months</span>
                                            <button onClick={async () => {
                                                if(!window.confirm('Delete this code?')) return;
                                                await fetch(`/api/admin/promos/${promo.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('lawyer_token')}` } });
                                                loadPromos();
                                            }} className="text-rose-400 hover:text-rose-300 font-bold text-xl">&times;</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Detailed Advocate View Modal (Log Activity) --- */}
            {selectedUserDetail && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedUserDetail(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold"
                        >
                            ✕
                        </button>
                        <h3 className="text-xl font-bold mb-4 text-white border-b border-slate-700 pb-2">Profile: {selectedUserDetail.user.full_name}</h3>

                        <div className="grid grid-cols-2 gap-4 mb-6 text-sm bg-slate-900 p-4 rounded-xl border border-slate-700">
                            <div><span className="text-slate-400 block text-xs uppercase font-medium">Phone Number</span> <span className="text-slate-200 font-bold">{selectedUserDetail.user.phone_number}</span></div>
                            <div><span className="text-slate-400 block text-xs uppercase font-medium">Joined Date</span> <span className="text-slate-200 font-bold">{formatDate(selectedUserDetail.user.created_at)}</span></div>
                            <div><span className="text-slate-400 block text-xs uppercase font-medium">Last Login</span> <span className="text-slate-200 font-bold">{formatDateTime(selectedUserDetail.user.last_login_at)}</span></div>
                            <div><span className="text-slate-400 block text-xs uppercase font-medium">Subscription Expires</span> <span className="text-slate-200 font-bold">{formatDate(selectedUserDetail.user.trial_ends_at)}</span></div>
                            <div><span className="text-slate-400 block text-xs uppercase font-medium">Active Clients</span> <span className="text-emerald-400 font-black text-lg">{selectedUserDetail.user.active_clients}</span></div>
                            <div><span className="text-slate-400 block text-xs uppercase font-medium">Inactive Clients</span> <span className="text-rose-400 font-black text-lg">{selectedUserDetail.user.inactive_clients}</span></div>
                        </div>

                        <h4 className="font-bold mb-3 text-slate-300">Recharge & Log Activity</h4>
                        {selectedUserDetail.recharges.length === 0 ? (
                            <p className="text-slate-500 text-sm italic bg-slate-900/50 p-4 rounded-lg border border-slate-800">No activity recorded yet.</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {selectedUserDetail.recharges.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-700">
                                        <div>
                                            {item.type === 'RECHARGE' ? (
                                                <div className="font-bold text-emerald-400">
                                                    ৳{item.amount} <span className="text-slate-500 text-xs font-normal ml-1">via {item.gateway_used || 'Manual'}</span>
                                                </div>
                                            ) : (
                                                <div className="font-bold text-blue-400">
                                                    {item.action_type}: <span className="text-slate-300 font-normal text-xs">{item.description}</span>
                                                </div>
                                            )}
                                            <div className="text-slate-400 text-xs mt-0.5">{formatDateTime(item.created_at)}</div>
                                        </div>
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${item.type === 'RECHARGE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                            {item.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- Sub-Admin View & Edit Modal --- */}
            {selectedAdmin && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setSelectedAdmin(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold">✕</button>

                        <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-5">
                            <h3 className="text-lg font-bold text-white">Sub-Admin Profile</h3>
                            <button
                                onClick={() => setIsEditingAdmin(!isEditingAdmin)}
                                className={`px-3 py-1 rounded text-xs font-bold transition ${isEditingAdmin ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                            >
                                {isEditingAdmin ? 'Cancel Edit' : 'Edit Admin'}
                            </button>
                        </div>

                        {!isEditingAdmin ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-900 p-4 rounded-xl border border-slate-700">
                                    <div><span className="text-slate-400 block text-xs uppercase font-medium">Name</span> <span className="text-white font-bold">{selectedAdmin.full_name}</span></div>
                                    <div><span className="text-slate-400 block text-xs uppercase font-medium">Login ID (Phone)</span> <span className="text-white font-bold">{selectedAdmin.phone_number}</span></div>
                                    <div><span className="text-slate-400 block text-xs uppercase font-medium">Account Status</span> <span className={selectedAdmin.is_active ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{selectedAdmin.is_active ? 'Active' : 'Locked'}</span></div>
                                    <div><span className="text-slate-400 block text-xs uppercase font-medium">Created Date</span> <span className="text-white font-bold">{formatDate(selectedAdmin.created_at)}</span></div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-300 mb-2">Assigned Roles</h4>
                                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-wrap gap-2">
                                        {(!selectedAdmin.admin_permissions || Object.keys(selectedAdmin.admin_permissions).length === 0) ? (
                                            <span className="text-slate-400 text-sm">Super Admin (All Access)</span>
                                        ) : (
                                            <>
                                                {selectedAdmin.admin_permissions.finance_ledger && <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-xs font-bold border border-slate-600">Financial Ledger</span>}
                                                {selectedAdmin.admin_permissions.user_management && <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-xs font-bold border border-slate-600">User Management</span>}
                                                {selectedAdmin.admin_permissions.user_mirroring && <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-xs font-bold border border-slate-600">User Mirroring</span>}
                                                {selectedAdmin.admin_permissions.subscription_plan && <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-xs font-bold border border-slate-600">Subscription Plans</span>}
                                                {selectedAdmin.admin_permissions.payment_gateway && <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-xs font-bold border border-slate-600">Payment Gateways</span>}
                                                {selectedAdmin.admin_permissions.referral_matrix && <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-xs font-bold border border-slate-600">Referral Matrix</span>}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdateAdmin} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                                    <input type="text" required value={editAdminForm.full_name} onChange={e => setEditAdminForm({...editAdminForm, full_name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Phone Number (Login ID)</label>
                                    <input type="text" required value={editAdminForm.phone} onChange={e => setEditAdminForm({...editAdminForm, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm" />
                                </div>

                                <div className="pt-2 border-t border-slate-700">
                                    <label className="block text-sm text-slate-300 font-bold mb-3">Edit Access Roles</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                                            <input type="checkbox" checked={editAdminForm.permissions.finance_ledger || false} onChange={e => setEditAdminForm({...editAdminForm, permissions: {...editAdminForm.permissions, finance_ledger: e.target.checked}})} className="w-4 h-4 rounded" />
                                            Financial Ledger
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                                            <input type="checkbox" checked={editAdminForm.permissions.user_management || false} onChange={e => setEditAdminForm({...editAdminForm, permissions: {...editAdminForm.permissions, user_management: e.target.checked}})} className="w-4 h-4 rounded" />
                                            User Management
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                                            <input type="checkbox" checked={editAdminForm.permissions.user_mirroring || false} onChange={e => setEditAdminForm({...editAdminForm, permissions: {...editAdminForm.permissions, user_mirroring: e.target.checked}})} className="w-4 h-4 rounded" />
                                            User Mirroring
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                                            <input type="checkbox" checked={editAdminForm.permissions.subscription_plan || false} onChange={e => setEditAdminForm({...editAdminForm, permissions: {...editAdminForm.permissions, subscription_plan: e.target.checked}})} className="w-4 h-4 rounded" />
                                            Subscription Plans
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                                            <input type="checkbox" checked={editAdminForm.permissions.payment_gateway || false} onChange={e => setEditAdminForm({...editAdminForm, permissions: {...editAdminForm.permissions, payment_gateway: e.target.checked}})} className="w-4 h-4 rounded" />
                                            Payment Gateways
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                                            <input type="checkbox" checked={editAdminForm.permissions.referral_matrix || false} onChange={e => setEditAdminForm({...editAdminForm, permissions: {...editAdminForm.permissions, referral_matrix: e.target.checked}})} className="w-4 h-4 rounded" />
                                            Referral Matrix
                                        </label>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-lg transition shadow mt-4">Save Changes</button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}