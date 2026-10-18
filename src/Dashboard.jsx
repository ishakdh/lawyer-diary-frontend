import { useState, useEffect, useCallback } from 'react';
import CalendarView from './CalendarView';
import CaseNotesModal from './CaseNotesModal';
import TopUpModal from './TopUpModal';
import ReferralModal from './ReferralModal';
import ProfileModal from './ProfileModal';
import SubscriptionModal from './SubscriptionModal';
import CaseStudyModal from './CaseStudyModal';

// Import the offline database and sync queue!
import { db, queueOfflineAction } from './localDB';

export default function Dashboard({ onLogout }) {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBtn, setShowInstallBtn] = useState(false);

    // --- NEW: Offline & Sync States ---
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncing, setSyncing] = useState(false);

    // Modal & View State
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [activeNotesCase, setActiveNotesCase] = useState(null);
    const [showReferralModal, setShowReferralModal] = useState(false);
    //Case Study
    const [showCaseStudyModal, setShowCaseStudyModal] = useState(false);
    const [showTomorrowAlert, setShowTomorrowAlert] = useState(false);
    const [tomorrowCases, setTomorrowCases] = useState([]);

    // Filter States
    const [currentFilterDate, setCurrentFilterDate] = useState(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

    // --- NEW: Search State ---
    const [searchQuery, setSearchQuery] = useState('');

    // Hearing Modal State
    const [hearingModalCase, setHearingModalCase] = useState(null);
    const [hearingNoteText, setHearingNoteText] = useState('');
    const [nextHearingDateInput, setNextHearingDateInput] = useState('');

    // Transfer Modal State
    const [transferModalCase, setTransferModalCase] = useState(null);
    const [transferForm, setTransferForm] = useState({ case_number: '', court_name: '', section: '' });

    // Close Case Modal State
    const [closeModalCase, setCloseModalCase] = useState(null);
    const [reminderModalCase, setReminderModalCase] = useState(null);
    const [closeReasonText, setCloseReasonText] = useState('');

    // Wallet, Security & Identity State
    const [walletBalance, setWalletBalance] = useState('0.00');
    const [isLocked, setIsLocked] = useState(false);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [lawyerName, setLawyerName] = useState(localStorage.getItem('lawyer_name') || 'Lawyer');

    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [staffForm, setStaffForm] = useState({ name: '', phone: '', password: '' });
    const API_BASE = import.meta.env.VITE_API_URL || 'https://server.lawyer.trvnx.com';

    const initialFormState = {
        case_number: '', section: '', client_name: '', client_phone: '', opponent_name: '', court_name: '', next_hearing_date: ''
    };
    const [formData, setFormData] = useState(initialFormState);


    // --- 1. THE FIXED AUTO-SYNC ENGINE ---
    const runSyncEngine = useCallback(async () => {
        if (!navigator.onLine) return;

        const pendingActions = await db.syncQueue.toArray();
        if (pendingActions.length === 0) return;

        setSyncing(true);
        const token = localStorage.getItem('lawyer_token');

        for (const item of pendingActions) {
            try {
                // Ensure endpoint is correctly formed with API_BASE
                const targetUrl = item.endpoint.startsWith('http') ? item.endpoint : `${API_BASE}${item.endpoint}`;

                const response = await fetch(targetUrl, {
                    method: item.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(item.payload)
                });

                if (response.ok) {
                    // Successfully synced to server, remove from local queue
                    await db.syncQueue.delete(item.id);
                } else {
                    console.warn(`Sync failed for item ${item.id}, server returned status ${response.status}`);
                }
            } catch (err) {
                console.warn('Sync network error for item:', item.id, err);
                // Continue loop or break depending on network availability
            }
        }

        setSyncing(false);
        // Refresh cases from live server to populate DB
        fetchCases();
    }, [API_BASE]);

    // --- 2. NETWORK LISTENERS & 12-HOUR TIMER ---
    useEffect(() => {
        const handleOnline = () => { setIsOnline(true); runSyncEngine(); };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const twelveHourInterval = setInterval(() => {
            runSyncEngine();
        }, 12 * 60 * 60 * 1000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(twelveHourInterval);
        };
    }, [runSyncEngine]);



    // --- 3. STARTUP DATA LOADING ---
    useEffect(() => {
        const loadInitialData = async () => {
            await loadCasesFromLocal();
            if (navigator.onLine) {
                fetchCases();
                fetchWallet();
                runSyncEngine();
            } else {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [runSyncEngine]);

    const loadCasesFromLocal = async () => {
        const localCases = await db.cases.toArray();
        if (localCases.length > 0) {
            setCases(localCases);
            setLoading(false);
        }
    };

    const fetchCases = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const response = await fetch(`${API_BASE}/api/cases`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setCases(data.cases);
                await db.cases.clear();
                await db.cases.bulkPut(data.cases);
            } else {
                setError('Failed to load live cases.');
            }
        } catch (err) {
            loadCasesFromLocal();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBtn(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        window.addEventListener('appinstalled', () => {
            setShowInstallBtn(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    // --- NEW: 4:30 PM Daily Digest Engine ---
    useEffect(() => {
        if (cases.length === 0) return;

        const checkAndShowReminder = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();

            // Trigger ONLY if it is 4:30 PM (16:30) or later
            if (hours > 16 || (hours === 16 && minutes >= 30)) {

                // Get tomorrow's date in YYYY-MM-DD format
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                // If they already clicked "Okay" today, don't annoy them again
                if (localStorage.getItem(`reminder_dismissed_${tomorrowStr}`) === 'true') return;

                // Find all cases scheduled for tomorrow
                const upcoming = cases.filter(c => {
                    if (!c.next_hearing_date) return false;
                    return new Date(c.next_hearing_date).toISOString().split('T')[0] === tomorrowStr;
                });

                if (upcoming.length > 0) {
                    setTomorrowCases(upcoming);
                    setShowTomorrowAlert(true);
                }
            }
        };

        // Check immediately when the app loads
        checkAndShowReminder();

        // Check every 60 seconds (in case they have the app open right at 4:29 PM)
        const interval = setInterval(checkAndShowReminder, 60000);
        return () => clearInterval(interval);
    }, [cases]);

    const fetchWallet = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const response = await fetch(`${API_BASE}/api/wallet`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setWalletBalance(data.balance);
                if (data.user?.full_name) {
                    setLawyerName(data.user.full_name);
                }
                const expirationDate = new Date(data.trial_ends_at);
                if (expirationDate < new Date()) {
                    setIsLocked(true);
                }
            }
        } catch (err) {
            console.error('Offline or failed wallet check.');
        }
    };

    // --- 4. OFFLINE CRUD OPERATIONS ---
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openNewCaseModal = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setShowModal(true);
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallBtn(false);
        }
    };

    const openEditModal = (caseItem) => {
        setEditingId(caseItem.id);
        const formattedDate = caseItem.next_hearing_date ? new Date(caseItem.next_hearing_date).toISOString().split('T')[0] : '';
        setFormData({ ...caseItem, section: caseItem.section || '', next_hearing_date: formattedDate });
        setShowModal(true);
    };

    const openTransferModal = (caseItem) => {
        setTransferModalCase(caseItem);
        setTransferForm({
            case_number: '',
            court_name: caseItem.court_name || '',
            section: caseItem.section || ''
        });
    };

    const handleSaveCase = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const token = localStorage.getItem('lawyer_token');
        const url = editingId ? `${API_BASE}/api/cases/${editingId}` : `${API_BASE}/api/cases`;
        const method = editingId ? 'PUT' : 'POST';

        if (isOnline) {
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                if (data.success) {
                    setShowModal(false);
                    fetchCases();
                } else alert(data.message || 'Failed to save case');
            } catch (err) {
                await saveCaseOffline(url, method);
            }
        } else {
            await saveCaseOffline(url, method);
        }
        setIsSubmitting(false);
    };

    const saveCaseOffline = async (url, method) => {
        const tempId = editingId || `offline-${Date.now()}`;
        const offlineCase = { ...formData, id: tempId, is_closed: false, is_transferred: false };
        await db.cases.put(offlineCase);
        await queueOfflineAction('SAVE_CASE', url, method, formData);
        setShowModal(false);
        loadCasesFromLocal();
        alert('Saved to device. Will sync to chamber when online.');
    };

    const handleCompleteHearingSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const endpoint = `${API_BASE}/api/cases/${hearingModalCase.id}/hearing`;
        const payload = { hearing_note: hearingNoteText, next_hearing_date: nextHearingDateInput || null };

        if (isOnline) {
            try {
                const token = localStorage.getItem('lawyer_token');
                const response = await fetch(endpoint, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.success) {
                    setHearingModalCase(null);
                    setHearingNoteText('');
                    setNextHearingDateInput('');
                    fetchCases();
                } else alert(data.message || 'Failed to complete hearing.');
            } catch (err) {
                await completeHearingOffline(endpoint, payload);
            }
        } else {
            await completeHearingOffline(endpoint, payload);
        }
        setIsSubmitting(false);
    };

    const completeHearingOffline = async (endpoint, payload) => {
        const updated = {
            ...hearingModalCase,
            next_hearing_date: payload.next_hearing_date,
            notes: hearingModalCase.notes ? `${hearingModalCase.notes}\n[OFFLINE] ${payload.hearing_note}` : `[OFFLINE] ${payload.hearing_note}`
        };
        await db.cases.put(updated);
        await queueOfflineAction('COMPLETE_HEARING', endpoint, 'PUT', payload);
        setHearingModalCase(null);
        setHearingNoteText('');
        setNextHearingDateInput('');
        loadCasesFromLocal();
        alert('Hearing saved offline.');
    };

    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const endpoint = `${API_BASE}/api/cases/${transferModalCase.id}/transfer`;

        if (isOnline) {
            try {
                const token = localStorage.getItem('lawyer_token');
                const response = await fetch(endpoint, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(transferForm)
                });
                const data = await response.json();
                if (data.success) {
                    setTransferModalCase(null);
                    fetchCases();
                } else alert(data.message || 'Failed to transfer case.');
            } catch (err) {
                await transferOffline(endpoint);
            }
        } else {
            await transferOffline(endpoint);
        }
        setIsSubmitting(false);
    };

    const transferOffline = async (endpoint) => {
        const updated = {
            ...transferModalCase,
            old_case_number: transferModalCase.case_number,
            old_court_name: transferModalCase.court_name,
            old_section: transferModalCase.section,
            case_number: transferForm.case_number,
            court_name: transferForm.court_name,
            section: transferForm.section
        };
        await db.cases.put(updated);
        await queueOfflineAction('TRANSFER_CASE', endpoint, 'PUT', transferForm);
        setTransferModalCase(null);
        loadCasesFromLocal();
        alert('Case transfer saved offline.');
    };

    const handleToggleClose = async (caseItem, reason = '') => {
        setIsSubmitting(true);
        const endpoint = `${API_BASE}/api/cases/${caseItem.id}/toggle-close`;
        const payload = { close_reason: reason };

        if (isOnline) {
            try {
                const token = localStorage.getItem('lawyer_token');
                const response = await fetch(endpoint, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.success) {
                    setCloseModalCase(null);
                    setCloseReasonText('');
                    fetchCases();
                } else alert(data.message || 'Failed to update status.');
            } catch (err) {
                await toggleCloseOffline(caseItem, endpoint, payload);
            }
        } else {
            await toggleCloseOffline(caseItem, endpoint, payload);
        }
        setIsSubmitting(false);
    };

    const toggleCloseOffline = async (caseItem, endpoint, payload) => {
        const updated = { ...caseItem, is_closed: !caseItem.is_closed };
        await db.cases.put(updated);
        await queueOfflineAction('TOGGLE_CLOSE', endpoint, 'PATCH', payload);
        setCloseModalCase(null);
        setCloseReasonText('');
        loadCasesFromLocal();
        alert(`Case marked as ${updated.is_closed ? 'Closed' : 'Re-Opened'} offline.`);
    };

    const handleDeleteCase = async (id) => {
        if (!window.confirm('Are you sure you want to delete this case? This cannot be undone.')) return;

        if (isOnline) {
            try {
                const token = localStorage.getItem('lawyer_token');
                const response = await fetch(`${API_BASE}/api/cases/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if ((await response.json()).success) fetchCases();
            } catch (err) {
                await deleteOffline(id);
            }
        } else {
            await deleteOffline(id);
        }
    };

    const deleteOffline = async (id) => {
        await db.cases.delete(id);
        await queueOfflineAction('DELETE_CASE', `/api/cases/${id}`, 'DELETE', {});
        loadCasesFromLocal();
    };

    const handleSendReminder = (caseItem) => {
        if (!caseItem.client_phone) {
            alert('No phone number saved for this client.');
            return;
        }
        // Open the custom modal instead of window.confirm
        setReminderModalCase(caseItem);
    };

    const executeReminder = (platform) => {
        if (!reminderModalCase) return;

        // Clean the phone number (ensure country code)
        let phone = reminderModalCase.client_phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '88' + phone;

        // Format the date and generate the message
        const hearingDate = reminderModalCase.next_hearing_date
            ? new Date(reminderModalCase.next_hearing_date).toLocaleDateString('en-GB')
            : 'an upcoming date';

        const message = `Greeting from ${lawyerName}!\n\nThis is a reminder for your case (${reminderModalCase.case_number}) at ${reminderModalCase.court_name || 'Court'}. Your next hearing is scheduled for ${hearingDate}. Please be present on the scheduled date at 9:00 AM.`;

        const encodedMessage = encodeURIComponent(message);

        if (platform === 'whatsapp') {
            window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
        } else if (platform === 'sms') {
            window.open(`sms:+${phone}?body=${encodedMessage}`, '_self');
        }

        // Close the modal after sending
        setReminderModalCase(null);
    };

    // --- 5. SMART PREV/NEXT LOGIC (DAY VS MONTH) ---
    const handlePrev = () => {
        setShowUnassignedOnly(false);
        setCurrentFilterDate(prev => {
            const newDate = prev ? new Date(prev) : new Date();
            if (viewMode === 'calendar') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setDate(newDate.getDate() - 1);
            }
            return newDate;
        });
        setDateRange({ start: '', end: '' });
    };

    const handleNext = () => {
        setShowUnassignedOnly(false);
        setCurrentFilterDate(prev => {
            const newDate = prev ? new Date(prev) : new Date();
            if (viewMode === 'calendar') {
                newDate.setMonth(newDate.getMonth() + 1);
            } else {
                newDate.setDate(newDate.getDate() + 1);
            }
            return newDate;
        });
        setDateRange({ start: '', end: '' });
    };

    const handleToday = () => {
        setShowUnassignedOnly(false);
        setCurrentFilterDate(new Date());
        setDateRange({ start: '', end: '' });
    };

    // Count active cases with no hearing date assigned
    const unassignedCount = cases.filter(c => !c.next_hearing_date && !c.is_closed).length;

    const filteredCases = cases.filter(c => {
        // --- NEW: Search Filter Logic ---
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                (c.client_name && c.client_name.toLowerCase().includes(query)) ||
                (c.client_phone && c.client_phone.toLowerCase().includes(query)) ||
                (c.case_number && c.case_number.toLowerCase().includes(query));

            if (!matchesSearch) return false;
        }

        // When "Add Hearing Date" filter is active, only show open cases without a hearing date
        if (showUnassignedOnly) {
            return !c.next_hearing_date && !c.is_closed;
        }

        if (!c.next_hearing_date) return currentFilterDate === null && dateRange.start === '';

        const caseDateStr = new Date(c.next_hearing_date).toISOString().split('T')[0];

        if (currentFilterDate) {
            const filterStr = currentFilterDate.toISOString().split('T')[0];
            return caseDateStr === filterStr;
        }

        if (dateRange.start && dateRange.end) {
            return caseDateStr >= dateRange.start && caseDateStr <= dateRange.end;
        }

        return true;
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-12 select-none overflow-x-hidden">
            {/* OFFLINE / SYNC STATUS BANNER */}
            <div className="bg-slate-900 text-white px-3 md:px-6 py-1.5 flex justify-between items-center text-xs font-semibold shadow-inner">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-pulse'}`}></span>
                    <span>{isOnline ? 'System Online' : 'Court Mode (Offline)'}</span>
                </div>
                {syncing && <span className="text-blue-300 animate-pulse tracking-wide">Syncing data to server...</span>}
            </div>

            {localStorage.getItem('admin_token_backup') && (
                <div className="bg-amber-500 text-slate-900 px-3 md:px-6 py-2.5 flex justify-between items-center text-xs md:text-sm font-semibold shadow-md border-b border-amber-600 sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <span className="text-base">⚠</span>
                        <span className="hidden md:inline">You are currently mirroring this lawyer account in Read/Write Mode.</span>
                        <span className="md:hidden">Mirroring Account (Read/Write)</span>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.setItem('lawyer_token', localStorage.getItem('admin_token_backup'));
                            localStorage.removeItem('admin_token_backup');
                            window.location.reload();
                        }}
                        className="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition shadow whitespace-nowrap"
                    >
                        Exit Admin
                    </button>
                </div>
            )}


            {/* TOP APP HEADER - MOBILE OPTIMIZED */}
            <nav className="bg-blue-600 text-white p-3 md:p-4 shadow-md flex justify-between items-center sticky top-0 z-30">
                <h1 className="text-sm md:text-xl font-bold truncate whitespace-nowrap pr-2">
                    {lawyerName === 'Lawyer' ? 'Lawyer Diary' : `${lawyerName}'s Diary`}
                </h1>

                <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
                    {/* --- PLACE THE INSTALL BUTTON CODE HERE --- */}
                    {showInstallBtn && (
                        <button
                            onClick={handleInstallClick}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-sm font-bold transition shadow whitespace-nowrap flex items-center gap-1 animate-pulse"
                        >
                            <span>📥 Install App</span>
                        </button>
                    )}

                    <div className="bg-blue-800/50 px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-[10px] md:text-sm font-medium border border-blue-400/30">
                        ৳{Number(walletBalance).toFixed(0)}
                    </div>

                    <button
                        onClick={() => setShowTopUpModal(true)}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-sm font-bold transition shadow whitespace-nowrap"
                    >
                        + Top Up
                    </button>

                    {/* --- NEW PROFILE DROPDOWN MENU --- */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-800 border-2 border-blue-400/50 hover:bg-blue-700 transition font-bold shadow"
                        >
                            {lawyerName.charAt(0).toUpperCase()}
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-slate-800 z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                    <p className="text-sm font-bold truncate">{lawyerName}</p>
                                </div>
                                <button
                                    onClick={() => { setShowProfileModal(true); setShowProfileMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 transition border-b border-slate-100 flex items-center gap-2"
                                >
                                    👤 My Profile
                                </button>
                                <button
                                    onClick={() => { setShowStaffModal(true); setShowProfileMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 transition border-b border-slate-100 flex items-center gap-2 text-indigo-700"
                                >
                                    👥 Add Staff
                                </button>
                                <button
                                    onClick={() => { setShowSubscriptionModal(true); setShowProfileMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 transition border-b border-slate-100 flex items-center gap-2"
                                >
                                    💳 Subscription
                                </button>
                                <button
                                    onClick={() => { setShowReferralModal(true); setShowProfileMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 transition border-b border-slate-100 flex items-center gap-2"
                                >
                                    🎁 Refer & Earn
                                </button>
                                <button
                                    onClick={onLogout}
                                    className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2"
                                >
                                    🚪 Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {isLocked ? (
                <div className="max-w-2xl mx-auto mt-6 md:mt-16 bg-white rounded-xl shadow-xl overflow-hidden border border-red-200 text-center m-4 md:m-auto">
                    <div className="bg-red-50 p-6 border-b border-red-100">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h2 className="text-xl md:text-2xl font-bold text-red-700 mb-2">Subscription Expired</h2>
                        <p className="text-xs md:text-base text-red-600">Your free trial or monthly subscription has ended. Please top up your wallet to regain access to your workspace.</p>
                    </div>
                    <div className="p-4 md:p-8">
                        <p className="text-slate-600 mb-6 text-sm">Current Wallet Balance: <strong className="text-slate-800 text-lg md:text-xl">৳{Number(walletBalance).toFixed(2)}</strong></p>

                        <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-4">
                            <button onClick={() => setShowTopUpModal(true)} className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition text-sm">Top Up via bKash</button>
                            <button onClick={() => setShowReferralModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-bold shadow-md transition text-sm">🎁 Refer & Earn</button>
                            <button onClick={() => setShowTopUpModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition text-sm">Top Up via Nagad</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-6xl mx-auto p-3 md:p-6">

                    {/* --- ACTION BAR WITH FLEX-WRAP & RESPONSIVE FILTERS --- */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 bg-white p-2.5 md:p-3 rounded-xl shadow-sm border border-slate-200">

                        {/* All Cases Button */}
                        <button
                            onClick={() => { setViewMode('list'); setCurrentFilterDate(null); setDateRange({start: '', end: ''}); setShowUnassignedOnly(false); }}
                            className={`px-3 py-1.5 md:px-4 rounded-md text-xs md:text-sm font-medium transition ${!currentFilterDate && !dateRange.start && !showUnassignedOnly && viewMode === 'list' ? 'bg-slate-800 shadow text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            All Cases
                        </button>

                        {/* SMART NAV GROUP: Prev, Today, Next, Calendar */}
                        <div className="flex border border-blue-600 rounded-lg overflow-hidden shadow-sm text-xs md:text-sm">
                            <button onClick={handlePrev} className="px-2.5 py-1.5 md:px-3 md:py-2 font-semibold transition bg-white text-blue-600 hover:bg-blue-50 border-r border-blue-600 flex items-center">
                                ⏪ <span className="hidden md:inline ml-1">Prev</span>
                            </button>

                            <button
                                onClick={() => { setViewMode('list'); handleToday(); }}
                                className={`px-2.5 py-1.5 md:px-4 md:py-2 font-semibold transition ${currentFilterDate && new Date(currentFilterDate).toDateString() === new Date().toDateString() && viewMode === 'list' ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                📅 Today
                            </button>

                            <button onClick={handleNext} className="px-2.5 py-1.5 md:px-3 md:py-2 font-semibold transition bg-white text-blue-600 hover:bg-blue-50 border-l border-blue-600 flex items-center">
                                <span className="hidden md:inline mr-1">Next</span> ⏭️
                            </button>

                            <button
                                onClick={() => { setViewMode('calendar'); setShowUnassignedOnly(false); }}
                                className={`px-2.5 py-1.5 md:px-4 md:py-2 font-semibold transition border-l border-blue-600 ${viewMode === 'calendar' ? 'bg-blue-700 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
                            >
                                🗓️ Calendar
                            </button>
                        </div>

                        {/* Clear Filter Indicator */}
                        {(currentFilterDate || showUnassignedOnly) && viewMode === 'list' && (
                            <button onClick={() => { setCurrentFilterDate(null); setShowUnassignedOnly(false); }} className="px-2 py-1.5 text-xs font-bold transition bg-slate-100 text-slate-500 hover:bg-slate-200 rounded">
                                ✕ Clear
                            </button>
                        )}

                        {/* Add New Case */}
                        <button onClick={openNewCaseModal} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold shadow transition ml-auto md:ml-0">
                            + Add Case
                        </button>

                        {/* NEW: Add Hearing Date Filter Button */}
                        <button
                            onClick={() => {
                                setViewMode('list');
                                setCurrentFilterDate(null);
                                setDateRange({ start: '', end: '' });
                                setShowUnassignedOnly(!showUnassignedOnly);
                            }}
                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold shadow transition flex items-center gap-1.5 ${
                                showUnassignedOnly
                                    ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }`}
                        >
                            <span>Add Hearing Date</span>
                            {unassignedCount > 0 && (
                                <span className="bg-white text-amber-700 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none">
                                    {unassignedCount}
                                </span>
                            )}
                        </button>

                        {/* AI Case Study Button */}
                        <button
                            onClick={() => setShowCaseStudyModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold shadow transition flex items-center gap-1.5"
                        >
                            <span>Case Study</span>
                        </button>

                        {/* Export (Hidden on mobile phones) */}
                        <button onClick={() => window.print()} className="hidden md:flex bg-slate-800 text-white hover:bg-slate-700 px-3 py-1.5 md:px-3.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition shadow items-center gap-1.5">
                            🖨️ Export
                        </button>

                        {/* Spacer to push the search and date filters to the right on Desktop */}
                        <div className="hidden md:block flex-1"></div>

                        {/* NEW: Live Search Bar */}
                        <div className="w-full md:w-auto mt-2 md:mt-0 relative">
                            <input
                                type="text"
                                placeholder="Search client, phone, or case no..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setViewMode('list'); // Switch to list mode when searching
                                }}
                                className="w-full md:w-64 text-xs md:text-sm p-2 pl-8 rounded-lg border border-slate-300 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-600 transition shadow-sm"
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Date to Date Filter (Wraps neatly on mobile) */}
                        <div className="flex items-center gap-1 border border-slate-300 rounded-lg p-1 bg-slate-50 w-full md:w-auto mt-2 md:mt-0 shadow-sm">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => { setDateRange({...dateRange, start: e.target.value}); setCurrentFilterDate(null); setShowUnassignedOnly(false); setViewMode('list'); }}
                                className="flex-1 md:flex-none text-[11px] md:text-xs p-1.5 rounded border border-slate-200 outline-none"
                            />
                            <span className="text-[10px] text-slate-500 font-bold px-1">TO</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => { setDateRange({...dateRange, end: e.target.value}); setCurrentFilterDate(null); setShowUnassignedOnly(false); setViewMode('list'); }}
                                className="flex-1 md:flex-none text-[11px] md:text-xs p-1.5 rounded border border-slate-200 outline-none"
                            />
                            {(dateRange.start || dateRange.end) && (
                                <button onClick={() => { setDateRange({start: '', end: ''}); setCurrentFilterDate(null); }} className="text-[10px] md:text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 rounded font-bold transition">
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-xs mb-2">{error}</div>}

                    {loading ? (
                        <div className="text-slate-500 text-center py-10 text-sm">Loading diary records...</div>
                    ) : (
                        viewMode === 'list' ? (
                            <>
                                {filteredCases.length === 0 && (
                                    <div className="p-8 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
                                        {showUnassignedOnly
                                            ? '🎉 All active cases have a hearing date assigned!'
                                            : 'No cases found matching criteria.'}
                                    </div>
                                )}

                                {/* --- DESKTOP VIEW: WIDE TABLE (Hidden on Mobile) --- */}
                                <div id="printable-cause-list" className="hidden md:block bg-white rounded-xl shadow overflow-hidden border border-slate-200">
                                    <div className="hidden print:block p-6 text-center border-b border-slate-300">
                                        <h1 className="text-2xl font-bold text-slate-900">ADVOCATE CHAMBER CAUSE LIST</h1>
                                        <p className="text-xs text-slate-500 mt-1">Generated on: {new Date().toLocaleDateString('en-GB')}</p>
                                    </div>

                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-sm">
                                            <th className="p-4 font-medium">Case No.</th>
                                            <th className="p-4 font-medium">Section</th>
                                            <th className="p-4 font-medium">Client</th>
                                            <th className="p-4 font-medium">Court</th>
                                            <th className="p-4 font-medium">Next Hearing</th>
                                            <th className="p-4 font-medium print:hidden text-right">Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {filteredCases.map((c) => (
                                            <tr key={c.id} className={`border-b border-slate-100 hover:bg-slate-50 ${c.is_closed ? 'opacity-70 bg-slate-50' : ''}`}>

                                                <td className="p-4">
                                                    <div className="font-medium text-slate-800">
                                                        {c.case_number}
                                                        {c.is_closed && <span className="ml-2 bg-slate-300 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Closed</span>}
                                                    </div>
                                                    {c.old_case_number && (
                                                        <div className="text-[11px] text-slate-400 mt-1"><span className="uppercase text-[9px] font-bold text-slate-500">Old:</span> {c.old_case_number}</div>
                                                    )}
                                                </td>

                                                <td className="p-4">
                                                    <div className="text-slate-600">{c.section || '-'}</div>
                                                    {c.old_section && <div className="text-[11px] text-slate-400 mt-1"><span className="uppercase text-[9px] font-bold text-slate-500">Old:</span> {c.old_section}</div>}
                                                </td>

                                                <td className="p-4 text-slate-600">
                                                    {c.client_name} <br/>
                                                    <span className="text-xs text-slate-400">{c.client_phone}</span>
                                                </td>

                                                <td className="p-4">
                                                    <div className="text-slate-600">{c.court_name}</div>
                                                    {c.old_court_name && <div className="text-[11px] text-slate-400 mt-1"><span className="uppercase text-[9px] font-bold text-slate-500">Old:</span> {c.old_court_name}</div>}
                                                </td>

                                                <td className="p-4 text-slate-800 font-medium">
                                                    {c.next_hearing_date ? new Date(c.next_hearing_date).toLocaleDateString('en-GB') : <span className="text-amber-600 italic">Not Assigned</span>}
                                                </td>

                                                <td className="p-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
                                                    {c.is_closed ? (
                                                        <>
                                                            <button onClick={() => setActiveNotesCase(c)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-md text-xs font-semibold transition">
                                                                Notes
                                                            </button>
                                                            <button onClick={() => handleToggleClose(c)} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-md text-xs font-semibold transition">
                                                                Re-Open
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setHearingModalCase(c);
                                                                    setHearingNoteText('');
                                                                    setNextHearingDateInput('');
                                                                }}
                                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${c.next_hearing_date ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                                                            >
                                                                {c.next_hearing_date ? 'Hearing' : 'Add Date'}
                                                            </button>

                                                            <button
                                                                onClick={() => handleSendReminder(c)}
                                                                className="bg-pink-100 text-pink-700 hover:bg-pink-200 px-3 py-1.5 rounded-md text-xs font-semibold transition"
                                                            >
                                                                Reminder
                                                            </button>

                                                            <button onClick={() => setActiveNotesCase(c)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-md text-xs font-semibold transition">
                                                                Notes
                                                            </button>

                                                            <button onClick={() => openTransferModal(c)} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-md text-xs font-semibold transition">
                                                                Transfer
                                                            </button>

                                                            <button onClick={() => openEditModal(c)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-md text-xs font-semibold transition">
                                                                Edit
                                                            </button>

                                                            <button onClick={() => setCloseModalCase(c)} className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-3 py-1.5 rounded-md text-xs font-semibold transition shadow-sm border border-slate-300">
                                                                Close
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* --- MOBILE VIEW: APP CARDS (Visible only on Mobile) --- */}
                                <div className="md:hidden space-y-3 print:hidden">
                                    {filteredCases.map((c) => (
                                        <div key={c.id} className={`bg-white rounded-xl shadow-sm border p-3.5 ${c.is_closed ? 'border-slate-200 opacity-80' : 'border-blue-100'}`}>

                                            {/* Card Header */}
                                            <div className="flex justify-between items-start mb-2.5 pb-2.5 border-b border-slate-100">
                                                <div>
                                                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                                                        {c.case_number}
                                                        {c.is_closed && <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">Closed</span>}
                                                    </h3>
                                                    {c.old_case_number && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Old No: {c.old_case_number}</p>}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wide block ${c.next_hearing_date ? 'text-blue-600' : 'text-amber-500'}`}>Next Hearing</span>
                                                    <p className="font-bold text-xs text-slate-800">{c.next_hearing_date ? new Date(c.next_hearing_date).toLocaleDateString('en-GB') : 'Not Set'}</p>
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                                <div>
                                                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide block mb-0.5">Client</span>
                                                    <p className="font-semibold text-slate-700 truncate">{c.client_name}</p>
                                                    <p className="text-[10px] text-slate-500">{c.client_phone}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide block mb-0.5">Court & Sec</span>
                                                    <p className="font-semibold text-slate-700 truncate">{c.court_name}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">Sec: {c.section || 'N/A'}</p>
                                                    {c.old_court_name && <p className="text-[9px] text-slate-400 mt-0.5">Old Court: {c.old_court_name}</p>}
                                                </div>
                                            </div>

                                            {/* Card Actions */}
                                            <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-slate-100 justify-end">
                                                {c.is_closed ? (
                                                    <>
                                                        <button onClick={() => setActiveNotesCase(c)} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-bold text-[11px] grow text-center">Notes</button>
                                                        <button onClick={() => handleToggleClose(c)} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold text-[11px] grow text-center">Re-Open</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => { setHearingModalCase(c); setHearingNoteText(''); setNextHearingDateInput(''); }} className={`px-2 py-1.5 rounded-lg font-bold text-[11px] grow text-center border ${c.next_hearing_date ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                            {c.next_hearing_date ? 'Hearing' : 'Add Date'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleSendReminder(c)}
                                                            className="bg-pink-50 text-pink-700 border border-pink-200 px-2 py-1.5 rounded-lg font-bold text-[11px] grow text-center"
                                                        >
                                                            Reminder
                                                        </button>
                                                        <button onClick={() => setActiveNotesCase(c)} className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1.5 rounded-lg font-bold text-[11px] grow text-center">Notes</button>
                                                        <button onClick={() => openTransferModal(c)} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1.5 rounded-lg font-bold text-[11px] grow text-center">Transfer</button>
                                                        <button onClick={() => openEditModal(c)} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1.5 rounded-lg font-bold text-[11px] grow text-center">Edit</button>
                                                        <button onClick={() => setCloseModalCase(c)} className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-1.5 rounded-lg font-bold text-[11px] grow text-center">Close</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <CalendarView
                                cases={cases}
                                date={currentFilterDate || new Date()}
                                onNavigate={(newDate) => setCurrentFilterDate(newDate)}
                            />
                        )
                    )}
                </div>
            )}

            {/* Hearing Completion Modal - Bottom Sheet on Mobile */}
            {hearingModalCase && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                    <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
                            <div>
                                <h3 className="text-sm font-bold">Complete Hearing</h3>
                                <p className="text-xs text-slate-400">Case No: {hearingModalCase.case_number}</p>
                            </div>
                            <button onClick={() => setHearingModalCase(null)} className="text-slate-400 hover:text-white text-2xl font-bold leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleCompleteHearingSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Hearing Details / Notes</label>
                                <textarea
                                    rows="4"
                                    placeholder="Write today's hearing proceedings, orders, or notes here..."
                                    value={hearingNoteText}
                                    onChange={(e) => setHearingNoteText(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-600"
                                ></textarea>
                                <p className="text-[11px] text-slate-400 mt-1">Note will be automatically timestamped.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Next Hearing Date (Optional)</label>
                                <input
                                    type="date"
                                    value={nextHearingDateInput}
                                    onChange={(e) => setNextHearingDateInput(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setHearingModalCase(null)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md w-full md:w-auto">
                                    {isSubmitting ? 'Saving...' : 'Finish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Case Modal - Bottom Sheet on Mobile */}
            {transferModalCase && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                    <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
                            <h3 className="text-sm font-bold">Transfer Case</h3>
                            <button onClick={() => setTransferModalCase(null)} className="text-slate-400 hover:text-white text-2xl font-bold leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleTransferSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs md:text-sm">
                                <div>
                                    <span className="text-[10px] md:text-xs text-slate-400 uppercase font-bold block mb-0.5">Old Case No:</span>
                                    <span className="font-bold text-sm md:text-base text-slate-800">{transferModalCase.case_number}</span>
                                </div>
                                <div>
                                    <input
                                        required
                                        type="text"
                                        value={transferForm.case_number}
                                        onChange={(e) => setTransferForm({...transferForm, case_number: e.target.value})}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-600"
                                        placeholder="New Case No *"
                                    />
                                </div>

                                <div>
                                    <span className="text-[10px] md:text-xs text-slate-400 uppercase font-bold block mb-0.5">Old Court Name:</span>
                                    <span className="font-semibold text-slate-800">{transferModalCase.court_name || 'N/A'}</span>
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        value={transferForm.court_name}
                                        onChange={(e) => setTransferForm({...transferForm, court_name: e.target.value})}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-600"
                                        placeholder="New Court Name"
                                    />
                                </div>

                                <div>
                                    <span className="text-[10px] md:text-xs text-slate-400 uppercase font-bold block mb-0.5">Old Section:</span>
                                    <span className="font-semibold text-slate-800">{transferModalCase.section || 'N/A'}</span>
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        value={transferForm.section}
                                        onChange={(e) => setTransferForm({...transferForm, section: e.target.value})}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-600"
                                        placeholder="New Section"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setTransferModalCase(null)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md w-full md:w-auto">
                                    {isSubmitting ? 'Transferring...' : 'Save Transfer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Case Modal - Bottom Sheet on Mobile */}
            {closeModalCase && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                    <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
                            <h3 className="text-sm font-bold">Close Case</h3>
                            <button onClick={() => setCloseModalCase(null)} className="text-slate-400 hover:text-white text-2xl font-bold leading-none">&times;</button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleToggleClose(closeModalCase, closeReasonText); }} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Reason for Closing (Optional)</label>
                                <textarea
                                    rows="3"
                                    placeholder="e.g. Case resolved, Bail granted..."
                                    value={closeReasonText}
                                    onChange={(e) => setCloseReasonText(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-slate-600"
                                ></textarea>
                                <p className="text-[11px] text-slate-400 mt-1">Closing this case will hide all management actions except Notes.</p>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setCloseModalCase(null)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-black rounded-lg shadow-md w-full md:w-auto">
                                    {isSubmitting ? 'Closing...' : 'Finish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Notes Modal */}
            {activeNotesCase && (
                <CaseNotesModal
                    caseItem={activeNotesCase}
                    onClose={() => setActiveNotesCase(null)}
                    onRefresh={fetchCases}
                />
            )}

            {/* Top Up Modal */}
            {showTopUpModal && (
                <TopUpModal
                    onClose={() => setShowTopUpModal(false)}
                    onSuccessfulTopUp={() => {
                        fetchWallet();
                        setIsLocked(false);
                    }}
                />
            )}

            {/* Referral Modal */}
            {showReferralModal && (
                <ReferralModal
                    onClose={() => setShowReferralModal(false)}
                />
            )}

            {/* Add/Edit Modal - Bottom Sheet on Mobile */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                    <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Case' : 'Add New Case'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleSaveCase} className="p-5 space-y-3.5">
                            <div className="grid grid-cols-2 gap-3">
                                <input required placeholder="Case Number *" name="case_number" value={formData.case_number} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>
                                <input placeholder="Court Name" name="court_name" value={formData.court_name || ''} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>
                            </div>

                            <input placeholder="Section (e.g. 302 IPC)" name="section" value={formData.section || ''} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>

                            <div className="grid grid-cols-2 gap-3">
                                <input required placeholder="Client Name *" name="client_name" value={formData.client_name} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>
                                <input required type="tel" placeholder="Client Phone *" name="client_phone" value={formData.client_phone} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>
                            </div>

                            <input placeholder="Opponent Name" name="opponent_name" value={formData.opponent_name || ''} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>

                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1 font-bold uppercase">Next Hearing Date</label>
                                <input type="date" name="next_hearing_date" value={formData.next_hearing_date} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md w-full md:w-auto">
                                    {isSubmitting ? 'Saving...' : (editingId ? 'Update Case' : 'Save Case')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Profile Modal */}
            {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}

            {/* Subscription Modal */}
            {showSubscriptionModal && <SubscriptionModal onClose={() => setShowSubscriptionModal(false)} cases={cases} />}
            {showCaseStudyModal && (
                <CaseStudyModal
                    onClose={() => setShowCaseStudyModal(false)}
                    onBalanceDeducted={fetchWallet}
                    currentWalletBalance={walletBalance}
                />
            )}
            {/* Urgent Tomorrow Reminder Modal */}
            {showTomorrowAlert && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center gap-3">
                            <span className="text-2xl">🔔</span>
                            <h3 className="text-white font-bold text-lg">Tomorrow's Case Reminder</h3>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-800 font-medium mb-1">Hi</p>
                            <p className="text-slate-800 font-black text-xl mb-4">{lawyerName}</p>

                            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                                This is for your kind reminder that you have the following case(s) on <strong>{new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}</strong>:
                            </p>

                            <div className="overflow-x-auto border border-slate-200 rounded-lg mb-5 max-h-60 overflow-y-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 sticky top-0 z-10">
                                        <th className="p-3 font-bold border-r border-slate-200 w-12 text-center">No</th>
                                        <th className="p-3 font-bold border-r border-slate-200">Client Name</th>
                                        <th className="p-3 font-bold">Court Name</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tomorrowCases.map((c, idx) => (
                                        <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                            <td className="p-3 text-center border-r border-slate-200 font-medium text-slate-500">{idx + 1}</td>
                                            <td className="p-3 border-r border-slate-200">
                                                <div className="font-bold text-slate-800">{c.client_name}</div>
                                            </td>
                                            <td className="p-3 text-slate-700 font-medium">{c.court_name}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <p className="text-center italic text-rose-600 font-bold text-sm mb-6 bg-rose-50 py-3 px-2 rounded-lg border border-rose-100">
                                "Do you make preparation & notify your all client?"
                            </p>

                            <button
                                onClick={() => {
                                    // Save to local storage so it doesn't pop up again today
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    localStorage.setItem(`reminder_dismissed_${tomorrow.toISOString().split('T')[0]}`, 'true');
                                    setShowTomorrowAlert(false);
                                }}
                                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl shadow-lg transition duration-200"
                            >
                                Okay
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Custom Send Reminder Modal */}
            {reminderModalCase && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
                    <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="text-sm font-bold">Send Reminder</h3>
                            <button onClick={() => setReminderModalCase(null)} className="text-slate-400 hover:text-white text-2xl font-bold leading-none">&times;</button>
                        </div>

                        <div className="p-5 flex flex-col gap-3">
                            <p className="text-sm text-slate-700 font-medium mb-2 text-center">
                                Send reminder to <span className="font-bold text-slate-900">{reminderModalCase.client_name}</span>?
                            </p>

                            <button
                                onClick={() => executeReminder('whatsapp')}
                                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2"
                            >
                                <span>💬</span> 1. Send via WhatsApp
                            </button>

                            <button
                                onClick={() => executeReminder('sms')}
                                className="w-full py-3.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2"
                            >
                                <span>📱</span> 2. Send via SMS
                            </button>

                            <button
                                onClick={() => setReminderModalCase(null)}
                                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition mt-2"
                            >
                                3. Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Staff Modal */}
            {showStaffModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in zoom-in-95">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="text-sm font-bold flex items-center gap-2"><span>👥</span> Create Staff ID</h3>
                            <button onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-white text-2xl font-bold leading-none">&times;</button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setIsSubmitting(true);
                            try {
                                const token = localStorage.getItem('lawyer_token');
                                const res = await fetch(`${API_BASE}/api/auth/add-staff`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({
                                        staff_name: staffForm.name,
                                        staff_phone: staffForm.phone,
                                        staff_password: staffForm.password
                                    })
                                });
                                const data = await res.json();
                                if (data.success) {
                                    alert(data.message);
                                    setShowStaffModal(false);
                                    setStaffForm({ name: '', phone: '', password: '' });
                                } else {
                                    alert(data.message || 'Failed to create staff ID.');
                                }
                            } catch (err) {
                                alert('Network error. Please try again.');
                            }
                            setIsSubmitting(false);
                        }} className="p-5 space-y-4">
                            <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                                Your junior or clerk can use these credentials to log in on their phone and manage this diary. They will not be able to change your main password.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Staff Name</label>
                                <input required type="text" placeholder="e.g. Rahim (Junior)" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Staff Phone Number</label>
                                <input required type="tel" placeholder="01XXXXXXXXX" value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Set Password</label>
                                <input required type="password" placeholder="Min 4 characters" value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"/>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowStaffModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md w-full md:w-auto">
                                    {isSubmitting ? 'Creating...' : 'Create ID'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}