import { useState } from 'react';

export default function CaseNotesModal({ caseItem, onClose, onRefresh }) {
    const [notes, setNotes] = useState(caseItem.notes || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveNotes = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('lawyer_token');
            const response = await fetch(`/api/cases/${caseItem.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...caseItem, notes })
            });

            const data = await response.json();
            if (data.success) {
                onRefresh();
                onClose();
            } else {
                alert(data.message || 'Failed to save notes.');
            }
        } catch (err) {
            alert('Server error while saving notes.');
        }
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Case Notes & History</h3>
                        <p className="text-sm text-slate-500">{caseItem.client_name} - {caseItem.case_number}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
                </div>

                {/* Text Area */}
                <div className="p-6 flex-grow flex flex-col">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Internal Case Notes (Not visible to client)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Type hearing updates, required documents, or private notes here..."
                        className="w-full flex-grow p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none resize-none font-sans"
                    ></textarea>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition">
                        Close
                    </button>
                    <button
                        onClick={handleSaveNotes}
                        disabled={isSaving}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow disabled:opacity-50 transition"
                    >
                        {isSaving ? 'Saving...' : 'Save Notes'}
                    </button>
                </div>

            </div>
        </div>
    );
}