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

    // Audio state (Browser Speech Recognition)
    const [isRecording, setIsRecording] = useState(false);

    // State for camera vs gallery popup choice menu
    const [showPickerMenu, setShowPickerMenu] = useState(false);

    // Copy Feedback State
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [copiedInsight, setCopiedInsight] = useState(false);

    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const textareaRef = useRef(null);

    useEffect(() => {
        fetchQuota();
    }, []);

    const fetchQuota = async () => {
        try {
            const token = localStorage.getItem('lawyer_token');
            const API_BASE = import.meta.env.VITE_API_URL || 'https://server.lawyer.trvnx.com';
            const res = await fetch(`${API_BASE}/api/case-study/quota`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setQuota(data);
        } catch (err) { console.error('Failed to load quota', err); }
    };

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setAnalyzing(true);
        try {
            for (const file of files) {
                const compressedImage = await compressImage(file);
                setImages(prev => [...prev, compressedImage]);
            }
        } catch (err) {
            console.error('Image compression error:', err);
        } finally {
            setAnalyzing(false);
        }
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    const MAX_DIMENSION = 1200;
                    if (width > height && width > MAX_DIMENSION) {
                        height = Math.round((height *= MAX_DIMENSION / width));
                        width = MAX_DIMENSION;
                    } else if (height > MAX_DIMENSION) {
                        width = Math.round((width *= MAX_DIMENSION / height));
                        height = MAX_DIMENSION;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve({ base64: compressedDataUrl, mimeType: 'image/jpeg' });
                };
            };
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

        try {
            const token = localStorage.getItem('lawyer_token');
            const API_BASE = import.meta.env.VITE_API_URL || 'https://server.lawyer.trvnx.com';
            const res = await fetch(`${API_BASE}/api/case-study/analyze`, {
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
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            const baseText = chatInput ? chatInput.trim() + ' ' : '';
            let sessionTranscript = '';
            let lastProcessedIndex = -1;

            recognition.onstart = () => setIsRecording(true);

            recognition.onresult = (event) => {
                let finalStr = '';
                let interimStr = '';

                if (event.resultIndex <= lastProcessedIndex) {
                    lastProcessedIndex = event.resultIndex - 1;
                }

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    let chunk = event.results[i][0].transcript;

                    if (event.results[i].isFinal) {
                        if (i > lastProcessedIndex) {
                            finalStr += chunk + ' ';
                            lastProcessedIndex = i;
                        }
                    } else {
                        interimStr += chunk;
                    }
                }

                if (finalStr) {
                    sessionTranscript += finalStr;
                }

                const updatedText = (baseText + sessionTranscript + interimStr).trim();
                setChatInput(updatedText);
                autoResizeTextarea();
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
            };

            recognition.onend = () => setIsRecording(false);

            try {
                recognition.start();
                recognitionRef.current = recognition;
                return;
            } catch (err) {
                console.error('Recognition start error:', err);
            }
        }

        // iPhone Fallback
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
            mediaRecorderRef.current = new MediaRecorder(stream, options);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    sendMessageToAI('', reader.result);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            alert('Microphone access denied.');
            console.error('Audio capture error:', err);
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        sendMessageToAI(chatInput);
        setChatInput('');
        if (textareaRef.current) textareaRef.current.style.height = '42px';
    };

    const sendMessageToAI = async (textMsg, audioBase64 = '') => {
        const userMsg = {
            role: 'user',
            text: audioBase64 ? '🎤 Voice Message sent' : textMsg,
            isAudio: !!audioBase64
        };

        if (!result) {
            setResult("GENERAL CASE DISCUSSION\n\nYou started a discussion without a document. You can continue asking legal questions below.");
        }

        setChatMessages(prev => [...prev, userMsg]);
        setChatLoading(true);

        try {
            const token = localStorage.getItem('lawyer_token');
            const API_BASE = import.meta.env.VITE_API_URL || 'https://server.lawyer.trvnx.com';
            const res = await fetch(`${API_BASE}/api/case-study/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    images,
                    language,
                    previousAnalysis: result,
                    chatMessages,
                    newMessage: textMsg,
                    newAudio: audioBase64
                })
            });
            const data = await res.json();
            if (data.success) {
                setChatMessages(prev => [...prev, { role: 'model', text: data.reply }]);
                if (data.charged && onBalanceDeducted) onBalanceDeducted();
                fetchQuota();
            } else {
                alert(data.message || 'Chat failed.');
            }
        } catch (err) {
            alert('Server connection error.');
        } finally {
            setChatLoading(false);
        }
    };

    const autoResizeTextarea = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
        }
    };

    const handleInputChange = (e) => {
        setChatInput(e.target.value);
        autoResizeTextarea();
    };

    const copyToClipboard = (text, index = null) => {
        navigator.clipboard.writeText(text).then(() => {
            if (index !== null) {
                setCopiedIndex(index);
                setTimeout(() => setCopiedIndex(null), 2000);
            } else {
                setCopiedInsight(true);
                setTimeout(() => setCopiedInsight(false), 2000);
            }
        });
    };

    // Calculate free remaining safely with instant default fallback (20)
    const freeRemaining = quota ? quota.free_remaining : 20;
    const walletBalance = quota ? Number(quota.wallet_balance).toFixed(2) : '0.00';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Modal Header */}
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


                {/* --- EXACT FORMATTED FREE USAGE & BILLING BANNER --- */}
                {!result && (
                    <div className="bg-purple-50 border-b border-purple-200 px-5 py-3 flex justify-between items-center shrink-0">
                        <div>
                            <p className="text-[10px] text-purple-700 font-black tracking-wider uppercase mb-0.5">Free Study & Billing Policy</p>
                            <p className="text-xs text-purple-900 font-medium leading-relaxed">
                                Free usage: <strong>{quota ? quota.used_this_month : 0} of 20 limit</strong>. After this, every case study will charge ৳1 for each case study.
                            </p>
                        </div>
                        <div className="bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm text-center shrink-0 ml-3">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Wallet</p>
                            <p className="text-xs font-black text-slate-800">
                                ৳{quota && quota.wallet_balance !== undefined ? Number(quota.wallet_balance).toFixed(2) : '619.00'}
                            </p>
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

                                <div
                                    onClick={() => setShowPickerMenu(true)}
                                    className="border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-purple-50/30 transition text-center"
                                >
                                    <span className="text-3xl mb-1">📸</span>
                                    <span className="text-xs font-bold text-purple-700">Tap to Take Photo or Choose from Gallery</span>
                                </div>

                                <input type="file" accept="image/*" capture="environment" id="cameraInput" onChange={handleFiles} className="hidden" />
                                <input type="file" accept="image/*" multiple id="galleryInput" onChange={handleFiles} className="hidden" />
                            </div>

                            {showPickerMenu && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 flex flex-col gap-3">
                                        <h3 className="text-base font-bold text-slate-800 text-center mb-1">Select Image Source</h3>
                                        <button type="button" onClick={() => { setShowPickerMenu(false); document.getElementById('cameraInput').click(); }} className="w-full py-3 px-4 bg-purple-600 text-white font-bold text-sm rounded-xl shadow flex items-center justify-center gap-2">
                                            <span>📷</span> Take Photo from Camera
                                        </button>
                                        <button type="button" onClick={() => { setShowPickerMenu(false); document.getElementById('galleryInput').click(); }} className="w-full py-3 px-4 bg-slate-100 text-slate-800 font-bold text-sm rounded-xl flex items-center justify-center gap-2">
                                            <span>🖼️</span> Upload from Gallery
                                        </button>
                                        <button type="button" onClick={() => setShowPickerMenu(false)} className="w-full py-2 text-xs font-bold text-slate-500 mt-1">Cancel</button>
                                    </div>
                                </div>
                            )}

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

                            {error && <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl text-sm font-bold text-center">{error}</div>}

                            <button onClick={handleAnalyze} disabled={analyzing || images.length === 0} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition shadow disabled:opacity-50 flex items-center justify-center gap-2">
                                {analyzing ? <span>⚙️ AI analyzing document...</span> : <span>Analyze Case Document ({images.length} Page{images.length > 1 ? 's' : ''})</span>}
                            </button>

                            {/* --- DISCUSS WITHOUT DOCUMENT & AUTO-GROWING TEXTAREA --- */}
                            <div className="mt-4 pt-4 border-t border-purple-100">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 text-center">
                                    Or Discuss A Case Without Document
                                </label>
                                <div className="flex gap-2 items-end">
                                    <button
                                        type="button"
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`p-3 rounded-xl text-white font-bold transition shadow-sm shrink-0 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-800'} disabled:opacity-50`}
                                        title={isRecording ? "Stop Recording" : "Speak"}
                                        disabled={chatLoading}
                                    >
                                        {isRecording ? '⏹️' : '🎙️'}
                                    </button>

                                    <form onSubmit={handleTextSubmit} className="flex gap-2 flex-1 items-end bg-white border border-slate-200 rounded-xl shadow-sm p-2">
                                        <textarea
                                            ref={textareaRef}
                                            rows="1"
                                            value={chatInput}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleTextSubmit(e);
                                                }
                                            }}
                                            placeholder={isRecording ? "Listening to your voice..." : "Type or speak your question..."}
                                            className="flex-1 px-2 py-1 text-sm outline-none resize-none overflow-y-auto max-h-[140px] leading-relaxed bg-transparent select-text"
                                            disabled={chatLoading || isRecording}
                                        />

                                        <button
                                            type="submit"
                                            disabled={!chatInput.trim() || chatLoading || isRecording}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition disabled:opacity-50 shrink-0"
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
                            {/* Left Box: Case Insight */}
                            <div className="flex-1 flex flex-col bg-slate-50 border border-slate-200 rounded-xl p-4 md:w-1/2">
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 shrink-0">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Case Insight</h4>
                                    <button
                                        onClick={() => copyToClipboard(result)}
                                        className="text-[11px] font-bold text-purple-700 hover:bg-purple-100 px-2.5 py-1 rounded-md transition flex items-center gap-1"
                                    >
                                        <span>📋</span> {copiedInsight ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <div className="flex-1 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans overflow-y-auto select-text">
                                    {result}
                                </div>
                                <button onClick={() => setResult('')} className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-800 text-center border-t pt-3">
                                    ← Scan a New Document
                                </button>
                            </div>

                            {/* Right Box: Chat Messages */}
                            <div className="flex-1 flex flex-col md:w-1/2">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 shrink-0">
                                    Ask Follow-up Questions (Free)
                                </h4>

                                <div className="flex-1 overflow-y-auto space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 shadow-inner h-[250px] md:h-auto">
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-2.5 rounded-xl max-w-[90%] text-xs whitespace-pre-wrap select-text ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm leading-relaxed'}`}>
                                                {msg.text}
                                            </div>
                                            {msg.role === 'model' && (
                                                <button
                                                    onClick={() => copyToClipboard(msg.text, i)}
                                                    className="text-[10px] text-purple-600 hover:text-purple-800 font-bold mt-1 px-1 transition flex items-center gap-0.5"
                                                >
                                                    <span>📋</span> {copiedIndex === i ? 'Copied!' : 'Copy'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl rounded-bl-none shadow-sm text-xs text-slate-500 font-medium">
                                                <span className="animate-pulse">AI is thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 items-end">
                                    <button
                                        type="button"
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`p-3 rounded-xl text-white font-bold transition shadow-sm shrink-0 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-800'} disabled:opacity-50`}
                                        title={isRecording ? "Stop Recording" : "Speak"}
                                        disabled={chatLoading}
                                    >
                                        {isRecording ? '⏹️' : '🎙️'}
                                    </button>

                                    <form onSubmit={handleTextSubmit} className="flex gap-2 flex-1 items-end bg-white border border-slate-200 rounded-xl shadow-sm p-2">
                                        <textarea
                                            ref={textareaRef}
                                            rows="1"
                                            value={chatInput}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleTextSubmit(e);
                                                }
                                            }}
                                            placeholder={isRecording ? "Listening to your voice..." : "Type or speak your question..."}
                                            className="flex-1 px-2 py-1 text-sm outline-none resize-none overflow-y-auto max-h-[140px] leading-relaxed bg-transparent select-text"
                                            disabled={chatLoading || isRecording}
                                        />

                                        <button
                                            type="submit"
                                            disabled={!chatInput.trim() || chatLoading || isRecording}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition disabled:opacity-50 shrink-0"
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