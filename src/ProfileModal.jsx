import { useState, useEffect } from 'react';

export default function ProfileModal({ onClose }) {
    const [profile, setProfile] = useState({ full_name: '', email: '', address: '', new_password: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/auth/profile', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('lawyer_token')}` }
                });
                const data = await res.json();
                if (data.success) setProfile({ ...data.profile, new_password: '' });
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchProfile();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('lawyer_token')}` },
                body: JSON.stringify(profile)
            });
            const data = await res.json();
            if (data.success) {
                alert('Profile updated successfully!');
                onClose();
            } else alert(data.message);
        } catch (err) { alert('Server error'); }
        setSaving(false);
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold">Edit Profile</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input required type="text" value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full p-2.5 border rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input type="email" value={profile.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full p-2.5 border rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chamber Address</label>
                        <textarea rows="2" value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full p-2.5 border rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500"></textarea>
                    </div>
                    <div className="border-t pt-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password (Leave blank to keep current)</label>
                        <input type="password" placeholder="Min 4 characters" value={profile.new_password} onChange={e => setProfile({...profile, new_password: e.target.value})} className="w-full p-2.5 border rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500"/>
                    </div>
                    <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}