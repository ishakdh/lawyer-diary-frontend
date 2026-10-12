import { useState, useEffect, useRef } from 'react';

export default function CaseStudyModal({ onClose, onBalanceDeducted }) {
    const [images, setImages] = useState([]);
    const [language, setLanguage] = useState('bn');
    const [quota, setQuota] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');

    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    // Audio states
    const [isRecording, setIsRecording] = useState(false);
    const [pendingAudio, setPendingAudio] = useState(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        fetchQuota();
    }, []);

    const fetchQuota = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/case-study/quota', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setQuota(data);
        } catch (err) { console.error('Failed to load quota', err); }
    };

    const handleFiles = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, { base64: reader.result, mimeType: file.type }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleAnalyze = async () => {
        if (!images.length) return;
        setAnalyzing(true);
        setError('');
        setResult('');
        setChatMessages([]);
        setPendingAudio(null);

        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/case-study/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ images, language })
            });
            const data = await res.json();
            if (data.success) {
                setResult(data.analysis);
                if (data.charged && onBalanceDeducted) onBalanceDeducted();
                fetchQuota();
            } else {
                setError(data.message || 'Analysis failed. Please try again.');
            }
        } catch (err) {
            setError('Server connection error. Please check your internet and try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                processAudioForHold(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            alert('Microphone access denied or unavailable.');
            console.error('Audio capture error:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudioForHold = (blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            setPendingAudio(reader.result);
        };
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!chatInput.trim() && !pendingAudio) return;
        sendMessageToAI(chatInput, pendingAudio);
    };

    const sendMessageToAI = async (textMsg, audioBase64) => {
        const userMsg = {
            role: 'user',
            text: audioBase64 ? '🎤 Voice Message sent' : textMsg,
            isAudio: !!audioBase64
        };

        // If starting directly from text/voice without an image, transition the UI instantly
        if (!result) {
            setResult("GENERAL CASE DISCUSSION\n\nYou started a discussion without a document. You can continue asking legal questions below.");
        }

        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setPendingAudio(null);
        setChatLoading(true);

        try {
            const token = localStorage.getItem('lawyer_token');
            const res = await fetch('/api/case-study/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    images,
                    language,
                    previousAnalysis: result,
                    chatMessages,
                    newMessage: textMsg,
                    newAudio: audioBase64 || ''
                })
            });
            const data = await res.json();
            if (data.success) {
                setChatMessages(prev => [...prev, { role: 'model', text: data.reply }]);
            } else {
                alert(data.message || 'Chat failed.');
            }
        } catch (err) {
            alert('Server connection error.');
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white px-5 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🪄</span>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Case Study & Document Analyzer</h3>
                            <p className="text-[11px] text-purple-200">FIR, Court Orders, Bail Petitions & Legal Documents</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-purple-200 hover:text-white text-2xl font-bold">&times;</button>
                </div>

                {quota && !result && (
                    <div className="bg-purple-50 px-5 py-2.5 border-b border-purple-100 flex justify-between items-center text-xs">
                        <div>
                            {quota.free_remaining > 0 ? (
                                <span className="text-purple-800 font-semibold">
                                    🎁 Free scans remaining this month: <strong>{quota.free_remaining}/10</strong>
                                </span>
                            ) : (
                                <span className="text-amber-800 font-semibold">
                                    ⚡ Free quota used. Standard rate: <strong>৳1 / scan</strong>
                                </span>
                            )}
                        </div>
                        <div className="text-slate-600 font-mono text-[11px]">
                            Balance: ৳{Number(quota.wallet_balance).toFixed(2)}
                        </div>
                    </div>
                )}

                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {!result && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    Select Output Language (আউটপুট ভাষা)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={() => setLanguage('bn')} className={`p-2.5 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${language === 'bn' ? 'bg-purple-600 text-white border-purple-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                                        🇧🇩 বাংলা (Bengali)
                                    </button>
                                    <button type="button" onClick={() => setLanguage('en')} className={`p-2.5 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${language === 'en' ? 'bg-purple-600 text-white border-purple-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                                        🇬🇧 English
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    Upload or Capture Document Photo(s)
                                </label>
                                <label className="border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-purple-50/30 transition text-center">
                                    <span className="text-3xl mb-1">📸</span>
                                    <span className="text-xs font-bold text-purple-700">Tap to Take Photo or Choose from Gallery</span>
                                    <input type="file" accept="image/*" multiple capture="environment" onChange={handleFiles} className="hidden" />
                                </label>
                            </div>

                            {images.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {images.map((img, idx) => (
                                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 shadow-sm">
                                            <img src={img.base64} alt="preview" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-0 right-0 bg-red-600 text-white text-[10px] px-1 rounded-bl">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl text-sm font-bold text-center">
                                    {error}
                                </div>
                            )}

                            <button onClick={handleAnalyze} disabled={analyzing || images.length === 0} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition shadow disabled:opacity-50 flex items-center justify-center gap-2">
                                {analyzing ? <span>⚙️ AI analyzing document...</span> : <span>Analyze Case Document ({images.length} Page{images.length > 1 ? 's' : ''})</span>}
                            </button>

                            {/* --- NEW: CHAT INPUT DIRECTLY ON HOME SCREEN --- */}
                            <div className="mt-4 pt-4 border-t border-purple-100">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 text-center">
                                    Or Discuss A Case Without Document
                                </label>
                                <div className="flex gap-2 shrink-0 items-center">
                                    <button
                                        type="button"
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`p-2.5 rounded-xl text-white font-bold transition shadow-sm ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-800'} disabled:opacity-50`}
                                        title={isRecording ? "Click to Stop Recording" : "Click to Record Voice"}
                                        disabled={chatLoading || pendingAudio !== null}
                                    >
                                        {isRecording ? '⏹️' : '🎙️'}
                                    </button>

                                    <form onSubmit={handleTextSubmit} className="flex gap-2 flex-1 items-center bg-white border border-slate-200 rounded-xl shadow-sm p-1">
                                        <input
                                            type="text"
                                            value={pendingAudio ? "🎤 Voice message ready to send..." : chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder={isRecording ? "Recording audio..." : "Message AI Assistant directly..."}
                                            className="flex-1 p-2 text-sm outline-none disabled:bg-transparent disabled:text-purple-700 disabled:font-medium"
                                            disabled={chatLoading || isRecording || pendingAudio !== null}
                                        />

                                        {pendingAudio && (
                                            <button
                                                type="button"
                                                onClick={() => setPendingAudio(null)}
                                                className="px-2 text-red-500 hover:text-red-700 text-lg font-bold"
                                            >
                                                &times;
                                            </button>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={(!chatInput.trim() && !pendingAudio) || chatLoading || isRecording}
                                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                                        >
                                            Send
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </>
                    )}

                    {result && (
                        <div className="flex flex-col md:flex-row gap-5 h-full min-h-[500px]">
                            <div className="flex-1 flex flex-col bg-slate-50 border border-slate-200 rounded-xl p-4 md:w-1/2">
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 shrink-0">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Case Insight</h4>
                                </div>
                                <div className="flex-1 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans overflow-y-auto">
                                    {result}
                                </div>
                                <button onClick={() => setResult('')} className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-800 text-center border-t pt-3">
                                    ← Scan a New Document
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col md:w-1/2">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 shrink-0">
                                    Ask Follow-up Questions (Free)
                                </h4>

                                <div className="flex-1 overflow-y-auto space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 shadow-inner h-[250px] md:h-auto">
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`p-2.5 rounded-xl max-w-[90%] text-xs whitespace-pre-wrap ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm leading-relaxed'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl rounded-bl-none shadow-sm text-xs text-slate-500 font-medium">
                                                <span className="animate-pulse">AI is listening and thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 shrink-0 items-center">
                                    <button
                                        type="button"
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`p-2.5 rounded-xl text-white font-bold transition shadow-sm ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-800'} disabled:opacity-50`}
                                        title={isRecording ? "Click to Stop Recording" : "Click to Record Voice"}
                                        disabled={chatLoading || pendingAudio !== null}
                                    >
                                        {isRecording ? '⏹️' : '🎙️'}
                                    </button>

                                    <form onSubmit={handleTextSubmit} className="flex gap-2 flex-1 items-center bg-white border border-slate-200 rounded-xl shadow-sm p-1">
                                        <input
                                            type="text"
                                            value={pendingAudio ? "🎤 Voice message ready to send..." : chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder={isRecording ? "Recording audio..." : "Message AI Assistant..."}
                                            className="flex-1 p-2 text-sm outline-none disabled:bg-transparent disabled:text-purple-700 disabled:font-medium"
                                            disabled={chatLoading || isRecording || pendingAudio !== null}
                                        />

                                        {pendingAudio && (
                                            <button
                                                type="button"
                                                onClick={() => setPendingAudio(null)}
                                                className="px-2 text-red-500 hover:text-red-700 text-lg font-bold"
                                            >
                                                &times;
                                            </button>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={(!chatInput.trim() && !pendingAudio) || chatLoading || isRecording}
                                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                                        >
                                            Send
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}