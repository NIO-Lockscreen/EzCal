import React, { useState } from 'react';
import { Settings, TrackingMode, LogEntry, Preset, AppData } from '../types';
import { X, Calculator, Download, Upload } from './Icons';
import CalculatorModal from './CalculatorModal';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onSave: (newSettings: Settings) => void;
    history?: LogEntry[];
    presets?: Preset[];
    onImportData?: (data: AppData) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    settings, 
    onSave,
    history = [],
    presets = [],
    onImportData
}) => {
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

    const handleExport = () => {
        const data: AppData = {
            history,
            presets,
            settings: {
                ...settings,
                goals: { cal: parseInt(cal) || 2000, pro: parseInt(pro) || 150 },
                mode: mode
            }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simplycal_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                // Basic validation
                if (json && (json.history || json.settings || json.presets)) {
                    if (window.confirm("Importing will merge this data with your current library. Existing items may be updated. Continue?")) {
                        if (onImportData) {
                            onImportData(json as AppData);
                            onClose();
                            alert("Data imported successfully!");
                        }
                    }
                } else {
                    alert("Invalid backup file format.");
                }
            } catch (err: any) {
                console.error(err);
                alert("Failed to import: " + (err.message || "Unknown error"));
            }
            // Reset input so same file can be selected again if needed
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
                <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-pop-in max-h-[90vh] overflow-y-auto no-scrollbar">
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

                        {/* Data Management Section */}
                        <div className="border-t border-gray-100 pt-6">
                            <label className="block text-sm font-bold text-gray-800 mb-3">Data Management</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={handleExport}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition border border-transparent hover:border-gray-200"
                                >
                                    <div className="mb-2 p-2 bg-white rounded-full shadow-sm text-gray-700">
                                        <Download className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-600">Export</span>
                                </button>
                                
                                <label className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition border border-transparent hover:border-gray-200 cursor-pointer">
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        className="hidden" 
                                        onChange={handleImportFile}
                                    />
                                    <div className="mb-2 p-2 bg-white rounded-full shadow-sm text-gray-700">
                                        <Upload className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-600">Import</span>
                                </label>
                            </div>
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