import React, { useState, useEffect, useMemo } from 'react';
import { LogEntry, Settings, Preset } from './types';
import { ChevronLeft, ChevronRight, SettingsIcon, BookOpen, Trash2, Bookmark } from './components/Icons';
import ProgressRing from './components/ProgressRing';
import SettingsModal from './components/SettingsModal';
import PresetsModal from './components/PresetsModal';
import SavePresetModal from './components/SavePresetModal';
import ConfirmModal from './components/ConfirmModal';
import CalendarModal from './components/CalendarModal';
import Confetti from './components/Confetti';
import InstallPrompt from './components/InstallPrompt';

// FIX: Use local time construction to prevent timezone shifting (UTC vs Local)
const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const DEFAULT_SETTINGS: Settings = { 
    goals: { cal: 2000, pro: 150 },
    mode: 'both' 
};

function App() {
    // --- State ---
    const [history, setHistory] = useState<LogEntry[]>([]);
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [presets, setPresets] = useState<Preset[]>([]);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    
    // Inputs
    const [inputCal, setInputCal] = useState('');
    const [inputPro, setInputPro] = useState('');

    // Modals & UI State
    const [showSettings, setShowSettings] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    // Staging Data
    const [entryToSave, setEntryToSave] = useState<LogEntry | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

    // --- Persistence ---
    useEffect(() => {
        const stored = localStorage.getItem('glowTracker');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.history) setHistory(parsed.history);
                if (parsed.presets) setPresets(parsed.presets);
                if (parsed.settings) {
                    setSettings(parsed.settings);
                } else if (parsed.goals) {
                    setSettings({ ...DEFAULT_SETTINGS, goals: parsed.goals });
                }
            } catch (e) {
                console.error("Failed to load data", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('glowTracker', JSON.stringify({ 
            history, 
            settings, 
            presets 
        }));
    }, [history, settings, presets]);

    // --- Derived Data ---
    const dateKey = formatDateKey(currentDate);
    // Fix: Ensure "isToday" comparison uses local string generation
    const isToday = dateKey === formatDateKey(new Date());

    const todaysLogs = useMemo(() => {
        return history.filter(h => h.date === dateKey).sort((a, b) => b.ts - a.ts);
    }, [history, dateKey]);

    const stats = useMemo(() => {
        return todaysLogs.reduce((acc, log) => ({
            cal: acc.cal + log.cal,
            pro: acc.pro + log.pro
        }), { cal: 0, pro: 0 });
    }, [todaysLogs]);

    const weeklyAvg = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weekKey = oneWeekAgo.getTime();
        
        const relevant = history.filter(h => h.ts > weekKey);
        const daysMap: Record<string, {cal: number, pro: number}> = {};
        
        relevant.forEach(h => {
            if (!daysMap[h.date]) daysMap[h.date] = { cal: 0, pro: 0 };
            daysMap[h.date].cal += h.cal;
            daysMap[h.date].pro += h.pro;
        });

        const daysLogged = Object.keys(daysMap).length || 1;
        const total = Object.values(daysMap).reduce((acc, d) => ({ cal: acc.cal + d.cal, pro: acc.pro + d.pro }), { cal: 0, pro: 0 });

        return {
            cal: Math.round(total.cal / daysLogged),
            pro: Math.round(total.pro / daysLogged)
        };
    }, [history]);

    // --- Actions ---
    const handleAdd = (c?: number, p?: number, label?: string) => {
        const cVal = c !== undefined ? c : parseInt(inputCal);
        const pVal = p !== undefined ? p : parseInt(inputPro);

        const cleanCal = isNaN(cVal) ? 0 : cVal;
        const cleanPro = isNaN(pVal) ? 0 : pVal;

        if (cleanCal === 0 && cleanPro === 0) return;

        // Check for celebration (Only triggers if adding data to TODAY)
        if (isToday) {
            const currentPro = stats.pro;
            const goalPro = settings.goals.pro;
            // Celebration Trigger: previously under goal, now met/exceeded
            if (currentPro < goalPro && (currentPro + cleanPro) >= goalPro) {
                setShowConfetti(true);
            }
        }

        const newEntry: LogEntry = {
            id: Date.now().toString() + Math.random().toString(),
            date: dateKey,
            ts: Date.now(),
            cal: cleanCal,
            pro: cleanPro,
            label: label
        };

        setHistory(prev => [...prev, newEntry]);
        setInputCal('');
        setInputPro('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const initiateDelete = (id: string) => {
        setEntryToDelete(id);
        setShowConfirmModal(true);
    };

    const confirmDelete = () => {
        if (entryToDelete) {
            setHistory(prev => prev.filter(h => h.id !== entryToDelete));
            setEntryToDelete(null);
        }
    };

    const initiateSavePreset = (entry: LogEntry) => {
        setEntryToSave(entry);
        setShowSaveModal(true);
    };

    const finalizeSavePreset = (name: string) => {
        if (entryToSave && name) {
            // 1. Add to presets list
            const newPreset: Preset = {
                id: Date.now().toString(),
                label: name,
                cal: entryToSave.cal,
                pro: entryToSave.pro
            };
            setPresets(prev => [...prev, newPreset]);
            
            // 2. Update the existing history entry with the new name
            setHistory(prev => prev.map(item => 
                item.id === entryToSave.id ? { ...item, label: name } : item
            ));

            setShowSaveModal(false);
            setEntryToSave(null);
        }
    };

    const handleDeletePreset = (id: string) => {
        setPresets(prev => prev.filter(p => p.id !== id));
    };

    const handleSelectPreset = (preset: Preset) => {
        handleAdd(preset.cal, preset.pro, preset.label);
        setShowPresets(false);
    };

    const changeDate = (days: number) => {
        const next = new Date(currentDate);
        next.setDate(currentDate.getDate() + days);
        setCurrentDate(next);
    };
    
    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
        setShowCalendar(false);
    };

    // --- Render Helpers ---
    const showCal = settings.mode === 'both' || settings.mode === 'cal';
    const showPro = settings.mode === 'both' || settings.mode === 'pro';

    return (
        <div className="min-h-screen pb-10 max-w-[480px] mx-auto px-5 pt-safe-top">
            {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
            <InstallPrompt />
            
            {/* Header */}
            <header className="flex justify-between items-center py-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-800">Hey! ✨</h1>
                    <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm font-medium">
                        <button onClick={() => changeDate(-1)} className="p-1 hover:bg-gray-200 rounded-full transition">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <button 
                            onClick={() => setShowCalendar(true)}
                            className="px-2 py-1 -mx-2 hover:bg-white/50 rounded-lg transition active:scale-95 flex items-center gap-1"
                        >
                            <span>{isToday ? "Today, " : ""}{getDisplayDate(currentDate)}</span>
                        </button>

                        <button 
                            onClick={() => changeDate(1)} 
                            disabled={isToday}
                            className={`p-1 rounded-full transition ${isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <button 
                    onClick={() => setShowSettings(true)} 
                    className="p-3 bg-white/50 rounded-2xl hover:bg-white transition shadow-sm active:scale-95"
                >
                    <SettingsIcon className="text-gray-700 w-6 h-6" />
                </button>
            </header>

            {/* Weekly Stats */}
            <div className="bg-white/60 backdrop-blur-xl rounded-[32px] p-6 shadow-sm border border-white/50 mb-6 animate-pop-in">
                <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold mb-4 shadow-md shadow-indigo-500/20">
                    WEEKLY AVERAGE
                </div>
                <div className={`flex justify-around items-center ${!showCal || !showPro ? 'justify-center' : ''}`}>
                    {showCal && (
                        <div className="text-center min-w-[80px]">
                            <span className="block text-3xl font-black text-gray-800">{weeklyAvg.cal}</span>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kcal</span>
                        </div>
                    )}
                    {showCal && showPro && <div className="w-px h-10 bg-gray-200"></div>}
                    {showPro && (
                        <div className="text-center min-w-[80px]">
                            <span className="block text-3xl font-black text-protein">{weeklyAvg.pro}</span>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Protein</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Rings & Input */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-lg shadow-gray-200/50 mb-8 border border-white animate-pop-in [animation-delay:100ms]">
                <div className={`grid gap-4 mb-8 ${settings.mode === 'both' ? 'grid-cols-2' : 'grid-cols-1 justify-items-center'}`}>
                    {showCal && (
                        <ProgressRing 
                            radius={settings.mode === 'both' ? 55 : 70} 
                            stroke={settings.mode === 'both' ? 10 : 12} 
                            progress={stats.cal / (settings.goals.cal || 1)} 
                            type="cal"
                            label={stats.cal.toString()} 
                            subLabel="kcal"
                        />
                    )}
                    {showPro && (
                        <ProgressRing 
                            radius={settings.mode === 'both' ? 55 : 70} 
                            stroke={settings.mode === 'both' ? 10 : 12} 
                            progress={stats.pro / (settings.goals.pro || 1)} 
                            type="pro"
                            label={stats.pro.toString()} 
                            subLabel="protein"
                        />
                    )}
                </div>

                <div className="flex gap-3">
                    <div className={`flex-1 grid gap-3 ${settings.mode === 'both' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {showCal && (
                            <input 
                                type="number" 
                                inputMode="numeric" 
                                placeholder="Cal" 
                                value={inputCal}
                                onChange={(e) => setInputCal(e.target.value)}
                                className="w-full bg-gray-100/50 rounded-2xl px-4 py-4 text-center font-bold text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-accent outline-none transition-all"
                            />
                        )}
                        {showPro && (
                            <input 
                                type="number" 
                                inputMode="numeric" 
                                placeholder="Pro" 
                                value={inputPro}
                                onChange={(e) => setInputPro(e.target.value)}
                                className="w-full bg-gray-100/50 rounded-2xl px-4 py-4 text-center font-bold text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-protein outline-none transition-all"
                            />
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={() => handleAdd()} 
                            className="h-full bg-gray-900 text-white rounded-2xl px-5 font-bold text-2xl active:scale-95 transition-transform shadow-lg shadow-gray-900/20"
                        >
                            +
                        </button>
                    </div>
                </div>
                 <button 
                    onClick={() => setShowPresets(true)}
                    className="mt-3 w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-accent transition"
                >
                    <BookOpen className="w-4 h-4" /> Use Saved Meal
                </button>
            </div>

            {/* History */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 ml-2">History</h3>
                <div className="bg-white/60 backdrop-blur-lg rounded-[32px] p-2 border border-white/50 min-h-[100px] animate-slide-up">
                    {todaysLogs.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            No magic added for this date yet ✨
                        </div>
                    ) : (
                        todaysLogs.map((log) => (
                            <div key={log.id} className="relative flex justify-between items-center p-4 mb-1 last:mb-0 rounded-2xl bg-white/40 hover:bg-white/80 transition-colors">
                                <div>
                                    <div className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-2">
                                        <span>{new Date(log.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {log.label && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                <span className="text-gray-700 font-semibold truncate max-w-[120px]">{log.label}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        {showCal && <span className="font-bold text-lg text-gray-800">{log.cal} kcal</span>}
                                        {showPro && <span className="text-sm font-bold text-protein">{log.pro}g pro</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 z-10 relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            initiateSavePreset(log);
                                        }}
                                        className="p-3 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-xl transition active:scale-90 cursor-pointer"
                                        aria-label="Save to presets"
                                    >
                                        <Bookmark className="w-5 h-5" filled={!!log.label} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            initiateDelete(log.id);
                                        }}
                                        className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition active:scale-90 cursor-pointer"
                                        aria-label="Delete entry"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            <SettingsModal 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
                settings={settings}
                onSave={setSettings} 
            />

            <PresetsModal 
                isOpen={showPresets} 
                onClose={() => setShowPresets(false)} 
                presets={presets}
                onSelect={handleSelectPreset}
                onDelete={handleDeletePreset}
            />

            <SavePresetModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={finalizeSavePreset}
            />

            <ConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Delete Entry?"
                message="Are you sure you want to remove this logged meal? This action cannot be undone."
            />

            <CalendarModal
                isOpen={showCalendar}
                onClose={() => setShowCalendar(false)}
                currentDate={currentDate}
                onSelectDate={handleDateSelect}
                history={history}
                goals={settings.goals}
            />
        </div>
    );
}

export default App;