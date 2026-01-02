import React, { useState } from 'react';
import { Settings, TrackingMode } from '../types';
import { X } from './Icons';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onSave: (newSettings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [cal, setCal] = useState(settings.goals.cal.toString());
    const [pro, setPro] = useState(settings.goals.pro.toString());
    const [mode, setMode] = useState<TrackingMode>(settings.mode);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            goals: {
                cal: parseInt(cal) || 2000,
                pro: parseInt(pro) || 150
            },
            mode: mode
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-pop-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Settings</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                
                <div className="space-y-6">
                    {/* Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Tracking Mode</label>
                        <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-xl">
                            {(['cal', 'both', 'pro'] as TrackingMode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                                        mode === m 
                                        ? 'bg-white text-gray-900 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {m === 'both' ? 'Both' : m === 'cal' ? 'Kcal' : 'Pro'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Goal Inputs */}
                    <div className="space-y-4">
                        {(mode === 'cal' || mode === 'both') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Daily Calories</label>
                                <input 
                                    type="number" 
                                    value={cal} 
                                    onChange={(e) => setCal(e.target.value)}
                                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-accent outline-none text-lg transition-all"
                                    placeholder="2000"
                                />
                            </div>
                        )}
                        {(mode === 'pro' || mode === 'both') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Daily Protein (g)</label>
                                <input 
                                    type="number" 
                                    value={pro} 
                                    onChange={(e) => setPro(e.target.value)}
                                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-protein outline-none text-lg transition-all"
                                    placeholder="150"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    className="mt-8 w-full bg-black text-white py-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform"
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default SettingsModal;