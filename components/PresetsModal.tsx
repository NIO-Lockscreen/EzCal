import React from 'react';
import { Preset } from '../types';
import { X, Trash2 } from './Icons';

interface PresetsModalProps {
    isOpen: boolean;
    onClose: () => void;
    presets: Preset[];
    onSelect: (preset: Preset) => void;
    onDelete: (id: string) => void;
}

const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose, presets, onSelect, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white/90 backdrop-blur-xl p-6 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md animate-slide-up sm:animate-pop-in max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Saved Meals</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                
                <div className="overflow-y-auto no-scrollbar space-y-3 flex-1">
                    {presets.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <p>No saved meals yet.</p>
                            <p className="text-sm mt-2">Tap the bookmark icon on a history item to save it here!</p>
                        </div>
                    ) : (
                        presets.map(preset => (
                            <div key={preset.id} className="flex items-center gap-3">
                                <button 
                                    onClick={() => onSelect(preset)}
                                    className="flex-1 text-left bg-white/50 hover:bg-white p-4 rounded-2xl border border-gray-100 transition shadow-sm flex justify-between items-center group"
                                >
                                    <div>
                                        <div className="font-bold text-gray-800">{preset.label || "Unnamed Meal"}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {preset.cal} kcal • <span className="text-protein">{preset.pro}g pro</span>
                                        </div>
                                    </div>
                                    <div className="text-accent font-bold opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                                        ADD +
                                    </div>
                                </button>
                                <button 
                                    onClick={() => onDelete(preset.id)}
                                    className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PresetsModal;