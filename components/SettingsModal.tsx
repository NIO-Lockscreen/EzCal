import React, { useState } from 'react';
import { Settings, TrackingMode } from '../types';
import { X, Calculator } from './Icons';
import CalculatorModal from './CalculatorModal';

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
    const [showCalculator, setShowCalculator] = useState(false);

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

    const handleAutoApply = (c: number, p: number) => {
        setCal(c.toString());
        setPro(p.toString());
        setShowCalculator(false);
    };

    return (
        <>
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
                            <div className="flex justify-between items-end">
                                <label className="block text-sm font-bold text-gray-800">Daily Goals</label>
                                <button 
                                    onClick={() => setShowCalculator(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-100 transition"
                                >
                                    <Calculator className="w-3 h-3" />
                                    <span>Auto Fill</span>
                                </button>
                            </div>

                            {(mode === 'cal' || mode === 'both') && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">CALORIES</label>
                                    <input 
                                        type="number" 
                                        value={cal} 
                                        onChange={(e) => setCal(e.target.value)}
                                        className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-accent outline-none text-lg transition-all font-bold text-gray-800"
                                        placeholder="2000"
                                    />
                                </div>
                            )}
                            {(mode === 'pro' || mode === 'both') && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">PROTEIN (g)</label>
                                    <input 
                                        type="number" 
                                        value={pro} 
                                        onChange={(e) => setPro(e.target.value)}
                                        className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-protein outline-none text-lg transition-all font-bold text-gray-800"
                                        placeholder="150"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        className="mt-8 w-full bg-black text-white py-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform shadow-xl shadow-gray-200"
                    >
                        Save Changes
                    </button>
                </div>
            </div>

            <CalculatorModal 
                isOpen={showCalculator} 
                onClose={() => setShowCalculator(false)} 
                onApply={handleAutoApply} 
            />
        </>
    );
};

export default SettingsModal;