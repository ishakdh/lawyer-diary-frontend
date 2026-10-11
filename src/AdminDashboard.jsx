import { useState, useEffect } from 'react';
import AdminGatewaySettings from './AdminGatewaySettings';

export default function AdminDashboard({ onLogout }) {
    const [data, setData] = useState({ tiers: [], settings: [], users: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for search, subscription filter, and View modal
    const [searchQuery, setSearchQuery] = useState('');
    const [subFilter, setSubFilter] = useState('all'); // 'all' | 'paid' | 'free'
    const [selectedUserDetail, setSelectedUserDetail] = useState(null);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const response = await fetch('/api/admin/dashboard-data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success) {
                setData({
                    tiers: result.tiers || [],
                    settings: result.settings || [],
                    users: result.users || []
                });
            } else {
                setError('Failed to load admin data.');
            }
        } catch (err) {
            setError('Server error connecting to Admin API.');
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (key, value) => {
        setData(prev => ({
            ...prev,
            settings: prev.settings.map(s => s.setting_key === key ? { ...s, setting_value: value } : s)
        }));
    };

    const handleTierChange = (id, value) => {
        setData(prev => ({
            ...prev,
            tiers: prev.tiers.map(t => t.id === id ? { ...t, monthly_price: value } : t)
        }));
    };

    const saveSetting = async (key, value) => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch(`/api/admin/settings/${key}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ setting_value: value })
            });
            const result = await res.json();
            if (result.success) alert('Setting updated successfully!');
            else alert('Failed to update setting.');
        } catch (err) {
            alert('Error updating setting.');
        }
    };

    const saveTier = async (id, price) => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch(`/api/admin/tiers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ monthly_price: price })
            });
            const result = await res.json();
            if (result.success) alert('Pricing tier updated successfully!');
            else alert('Failed to update tier.');
        } catch (err) {
            alert('Error updating tier.');
        }
    };

    // Open View Details Modal
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

    // Action Handlers
    const handleMirror = async (id) => { console.log('Mirroring user:', id); };
    const handleToggleStatus = async (id) => { console.log('Toggling status for:', id); };
    const handleDelete = async (id) => { console.log('Deleting user:', id); };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-slate-400">Loading Master Admin Panel...</div>;

    return (
        <div className="min-h-screen bg-[#0f172a] font-sans text-slate-200">
            {/* Navbar */}
            <nav className="bg-[#1e293b] text-white p-4 shadow-md flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-600 text-white p-2 rounded-lg font-bold text-xs">ADMIN</div>
                    <h1 className="text-xl font-bold">Master Control Panel</h1>
                </div>
                <button onClick={onLogout} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm font-medium transition">
                    Admin Logout
                </button>
            </nav>

            <div className="max-w-7xl mx-auto p-6 space-y-8">
                {error && <div className="bg-red-900/50 text-red-400 p-4 rounded-lg border border-red-800">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* System Settings Panel */}
                    <div className="bg-[#1e293b] rounded-xl shadow border border-slate-700 overflow-hidden">
                        <div className="bg-[#1e293b] px-6 py-4 border-b border-slate-700">
                            <h2 className="text-lg font-bold text-slate-200">Global SaaS Settings</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {data.settings.map((setting) => (
                                <div key={setting.setting_key} className="flex items-end gap-4">
                                    <div className="flex-grow">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            {setting.setting_key.replace(/_/g, ' ')}
                                        </label>
                                        <input
                                            type="text"
                                            value={setting.setting_value}
                                            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded focus:ring-2 focus:ring-purple-600 outline-none text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={() => saveSetting(setting.setting_key, setting.setting_value)}
                                        className="bg-purple-600 text-white hover:bg-purple-500 px-4 py-2 rounded-lg font-medium transition h-[42px]"
                                    >
                                        Save
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pricing Tiers Panel */}
                    <div className="bg-[#1e293b] rounded-xl shadow border border-slate-700 overflow-hidden">
                        <div className="bg-[#1e293b] px-6 py-4 border-b border-slate-700">
                            <h2 className="text-lg font-bold text-slate-200">Dynamic Subscription Tiers (BDT)</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {data.tiers.map((tier) => (
                                <div key={tier.id} className="flex items-end gap-4">
                                    <div className="flex-grow">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            {tier.tier_name} ({tier.min_clients} to {tier.max_clients || 'Unlimited'} clients)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-slate-400">৳</span>
                                            <input
                                                type="number"
                                                value={tier.monthly_price}
                                                onChange={(e) => handleTierChange(tier.id, e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-600 rounded focus:ring-2 focus:ring-purple-600 outline-none text-white"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => saveTier(tier.id, tier.monthly_price)}
                                        className="bg-purple-600 text-white hover:bg-purple-500 px-4 py-2 rounded-lg font-medium transition h-[42px]"
                                    >
                                        Save
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Payment Gateway Settings Component */}
                <AdminGatewaySettings />

                {/* Users Table */}
                <div className="bg-[#1e293b] rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-lg font-bold text-white">Lawyer Database ({data.users.length})</h2>

                        {/* Search Box & Subscribed/Unsubscribed Filter Bar */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Search name or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-4 py-2 text-sm bg-slate-800 border border-slate-600 text-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 w-full md:w-64 placeholder-slate-400"
                            />
                            <select
                                value={subFilter}
                                onChange={(e) => setSubFilter(e.target.value)}
                                className="px-4 py-2 text-sm bg-slate-800 border border-slate-600 text-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all">All IDs</option>
                                <option value="paid">Paid ID (Subscribed)</option>
                                <option value="free">Free ID (Unsubscribed)</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-[#1e293b] text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                                <th className="p-4 font-medium">Name / Phone</th>
                                <th className="p-4 font-medium">Role</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Referrals</th>
                                <th className="p-4 font-medium">Expires</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.users
                                .filter(user => {
                                    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        user.phone_number?.includes(searchQuery) || user.phone?.includes(searchQuery);

                                    const isPaid = new Date(user.trial_ends_at) > new Date();
                                    const matchesSub = subFilter === 'all' ? true :
                                        subFilter === 'paid' ? isPaid : !isPaid;

                                    return matchesSearch && matchesSub;
                                })
                                .map((user) => {
                                    const isPaid = new Date(user.trial_ends_at) > new Date();
                                    return (
                                        <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-200">{user.full_name}</div>
                                                <div className="text-xs text-slate-400">{user.phone_number || user.phone}</div>
                                            </td>
                                            <td className="p-4"><span className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded">Advocate</span></td>
                                            <td className="p-4">
                                                    <span className={`px-2 py-1 text-xs rounded ${user.is_active ? 'bg-emerald-900/50 text-emerald-400' : 'bg-rose-900/50 text-rose-400'}`}>
                                                        {user.is_active ? 'Active' : 'Disabled'}
                                                    </span>
                                            </td>
                                            <td className="p-4 font-bold text-purple-400">{user.total_referrals || 0}</td>
                                            <td className="p-4 text-sm text-slate-400">
                                                {new Date(user.trial_ends_at).toLocaleDateString('en-GB')}
                                            </td>

                                            {/* Updated Actions Column: Status, View, Mirror... */}
                                            <td className="p-4 flex items-center gap-2">

                                                {/* 1. Status Indicator (Paid/Free) */}
                                                <span className={`px-3 py-1 rounded text-xs font-bold ${isPaid ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                                                    {isPaid ? 'Paid ID' : 'Free ID'}
                                                </span>

                                                {/* 2. View Button */}
                                                <button
                                                    onClick={() => handleOpenViewModal(user.id)}
                                                    className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-600/50 text-xs rounded transition-all"
                                                >
                                                    View
                                                </button>

                                                <button onClick={() => handleMirror(user.id)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded">Mirror</button>
                                                <button onClick={() => handleToggleStatus(user.id)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded">Disable</button>
                                                <button onClick={() => handleDelete(user.id)} className="px-3 py-1.5 bg-rose-900/50 text-rose-400 hover:bg-rose-600 hover:text-white text-xs rounded transition-all">Delete</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detailed Advocate View Modal Popup (Dark Theme) */}
            {selectedUserDetail && (
                <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedUserDetail(null)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xl font-bold"
                        >
                            ✕
                        </button>
                        <h3 className="text-xl font-bold mb-4 text-blue-400">Profile: {selectedUserDetail.user.full_name}</h3>

                        <div className="grid grid-cols-2 gap-4 mb-6 text-sm bg-[#1e293b] p-4 rounded-lg border border-slate-700/50">
                            <div><span className="text-slate-400 block text-xs">Phone Number</span> <span className="text-slate-200 font-medium">{selectedUserDetail.user.phone_number}</span></div>
                            <div><span className="text-slate-400 block text-xs">Joined Date</span> <span className="text-slate-200 font-medium">{new Date(selectedUserDetail.user.created_at).toLocaleDateString()}</span></div>
                            <div><span className="text-slate-400 block text-xs">Last Login</span> <span className="text-slate-200 font-medium">{selectedUserDetail.user.last_login_at ? new Date(selectedUserDetail.user.last_login_at).toLocaleString() : 'Never'}</span></div>
                            <div><span className="text-slate-400 block text-xs">Subscription Expires</span> <span className="text-slate-200 font-medium">{new Date(selectedUserDetail.user.trial_ends_at).toLocaleDateString()}</span></div>
                            <div><span className="text-slate-400 block text-xs">Active Clients</span> <span className="text-emerald-400 font-bold text-lg">{selectedUserDetail.user.active_clients}</span></div>
                            <div><span className="text-slate-400 block text-xs">Inactive Clients</span> <span className="text-rose-400 font-bold text-lg">{selectedUserDetail.user.inactive_clients}</span></div>
                        </div>

                        <h4 className="font-bold mb-3 text-slate-300">Recharge & Log Activity</h4>
                        {selectedUserDetail.recharges.length === 0 ? (
                            <p className="text-slate-500 text-sm italic bg-slate-800/30 p-4 rounded border border-slate-800">No activity recorded yet.</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {selectedUserDetail.recharges.map((pay, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-[#1e293b] p-3 rounded-lg border border-slate-700/50">
                                        <div>
                                            <div className="font-bold text-emerald-400">৳{pay.amount} <span className="text-slate-500 text-xs font-normal">via {pay.payment_method || 'Manual'}</span></div>
                                            <div className="text-slate-400 text-xs mt-1">{new Date(pay.created_at).toLocaleString()}</div>
                                        </div>
                                        <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 text-xs font-bold rounded">Success</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}