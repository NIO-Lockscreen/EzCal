import React, { useState, useEffect } from 'react';
import { X, Lock, SettingsIcon } from './Icons';

interface DoorAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DoorAccessModal: React.FC<DoorAccessModalProps> = ({ isOpen, onClose }) => {
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    
    // Token Management
    const [token, setToken] = useState('');
    const [showTokenInput, setShowTokenInput] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Check if user has previously authenticated on this device
            const savedAuth = localStorage.getItem('simplycal_door_auth');
            const authorized = savedAuth === 'true';
            setIsAuthorized(authorized);
            
            // Load saved token or default
            const savedToken = localStorage.getItem('simplycal_member_token');
            setToken(savedToken || '8ec43e57c02642c7bdf863903047e6c2');
            setShowTokenInput(false);
            
            setPassword('');
            setStatus('idle');
            setStatusMessage('');
        }
    }, [isOpen]);

    const handleUnlock = async () => {
        // If not already authorized, validate password
        if (!isAuthorized) {
            if (password !== 'Blank') {
                setStatus('error');
                setStatusMessage('Incorrect Password');
                return;
            }
            // Save authorization for future uses
            localStorage.setItem('simplycal_door_auth', 'true');
            setIsAuthorized(true);
        }

        setStatus('processing');
        setShowTokenInput(false);

        try {
            const response = await fetch('/api/door', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token })
            });

            if (response.ok) {
                setStatus('success');
                setStatusMessage('Door Unlocked!');
                setTimeout(onClose, 2000);
            } else {
                setStatus('error');
                setStatusMessage(`Failed: ${response.status}`);
                
                // If permission denied, likely token expired
                if (response.status === 403 || response.status === 401) {
                    setShowTokenInput(true);
                }
            }
        } catch (error) {
            console.error("Network error:", error);
            setStatus('error');
            setStatusMessage('Network Error (API Failed)');
        }
    };

    const handleSaveToken = () => {
        localStorage.setItem('simplycal_member_token', token);
        handleUnlock(); // Retry immediately
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-pop-in max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                         <div className="bg-gray-100 p-2 rounded-xl text-gray-700">
                            <Lock className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Gym Access</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                
                {status === 'success' ? (
                    <div className="py-8 text-center animate-pop-in">
                         <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            🔓
                         </div>
                         <h4 className="text-xl font-bold text-green-600">Door Opened!</h4>
                    </div>
                ) : (
                    <>
                        {!isAuthorized ? (
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter Password"
                                autoFocus
                                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-accent outline-none text-lg mb-4 text-center font-bold"
                            />
                        ) : (
                            <div className="mb-6 p-4 bg-green-50 rounded-2xl text-center border border-green-100 flex items-center justify-center gap-2">
                                <span className="text-green-700 font-bold text-sm">✓ Device Authorized</span>
                                <button 
                                    onClick={() => setShowTokenInput(!showTokenInput)}
                                    className="p-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-green-700 transition"
                                    title="Update Token Manually"
                                >
                                    <SettingsIcon className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                        
                        {status === 'error' && (
                            <div className="mb-4 text-center text-red-500 font-bold text-sm bg-red-50 py-2 rounded-xl">
                                {statusMessage}
                            </div>
                        )}

                        {showTokenInput && (
                            <div className="mb-4 animate-slide-up bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Update Session Token</label>
                                <textarea 
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    className="w-full p-3 bg-white rounded-xl border border-gray-200 text-xs font-mono text-gray-600 focus:ring-2 focus:ring-accent outline-none mb-2"
                                    rows={3}
                                />
                                <div className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                                    <strong>How to get:</strong> 
                                    <br/>1. Login to nidaro.no
                                    <br/>2. Open Inspector (F12) &gt; Network
                                    <br/>3. Filter for "checkin", trigger the door
                                    <br/>4. Look for <code>MemberSessionToken</code> in Headers (Cookie) or Payload
                                </div>
                                <button 
                                    onClick={handleSaveToken}
                                    className="w-full py-2 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-black transition"
                                >
                                    Save & Retry
                                </button>
                            </div>
                        )}

                        {!showTokenInput && (
                            <button 
                                onClick={handleUnlock}
                                disabled={(!isAuthorized && !password) || status === 'processing'}
                                className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${
                                    status === 'processing' 
                                    ? 'bg-gray-400 cursor-wait' 
                                    : 'bg-black active:scale-95'
                                }`}
                            >
                                {status === 'processing' ? 'Opening...' : 'Unlock Door'}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DoorAccessModal;