import React, { useState, useEffect } from 'react';
import { Preset, TrackingMode } from '../types';
import { X, Flame } from './Icons';

interface SuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogSuggestions: (items: Preset[]) => void;
    remainingCal: number;
    remainingPro: number;
    presets: Preset[];
    mode: TrackingMode;
}

const SuggestionModal: React.FC<SuggestionModalProps> = ({ 
    isOpen, 
    onClose, 
    onLogSuggestions, 
    remainingCal, 
    remainingPro, 
    presets,
    mode 
}) => {
    const [suggestions, setSuggestions] = useState<Preset[]>([]);
    const [totals, setTotals] = useState({ cal: 0, pro: 0 });
    const [isLoading, setIsLoading] = useState(false);

    // Heuristic Configuration
    const CAL_TOLERANCE_LOWER = 50;  // It's okay to be 50 under
    const CAL_TOLERANCE_UPPER = 50;  // It's okay to be 50 over (soft limit)
    const MAX_OVERAGE_HARD = 300;    // Hard limit: avoid results > 300 over unless impossible
    
    // Penalties
    const PENALTY_PER_CAL_OVER = 10;       // Steep linear penalty
    const PENALTY_PER_CAL_OVER_SQ = 0.05;  // Quadratic penalty for massive overages
    const PENALTY_MISSED_PRO = 50;         // Huge penalty per gram of missing protein
    const PENALTY_DUPLICATE = 200;         // Penalty for each duplicate item (encourages variety)
    
    const generate = () => {
        setIsLoading(true);
        
        setTimeout(() => {
            if (presets.length === 0) {
                setSuggestions([]);
                setIsLoading(false);
                return;
            }

            // --- PRE-PROCESSING ---
            // Calculate efficiency (Pro per Cal) for weighting
            const pool = presets.map(p => ({
                ...p,
                efficiency: p.pro / (p.cal || 1) // Higher is better for protein focus
            }));

            // Sort by efficiency just to have an order, though we pick randomly
            pool.sort((a, b) => b.efficiency - a.efficiency);

            let bestCombo: Preset[] = [];
            let bestScore = Infinity;

            const ITERATIONS = 3000; // Fast enough for modern browsers

            for (let i = 0; i < ITERATIONS; i++) {
                // 1. GENERATE A RANDOM PLATE
                const currentCombo: Preset[] = [];
                let currentCal = 0;
                let currentPro = 0;
                const counts: Record<string, number> = {};

                let attempts = 0;
                // Try to fill the plate until full or max items
                while (attempts < 20 && currentCombo.length < 15) {
                    attempts++;

                    const needCal = remainingCal - currentCal;
                    const needPro = remainingPro - currentPro;

                    // Stopping conditions
                    // If we hit protein goal (and we care about it) AND we are roughly near or over calorie goal
                    if (mode !== 'cal' && needPro <= 0 && currentCal >= (remainingCal - CAL_TOLERANCE_LOWER)) break;
                    
                    // If we hit calorie goal (and we care about it)
                    if (mode !== 'pro' && Math.abs(needCal) <= CAL_TOLERANCE_UPPER) break;

                    // Hard Stop if way over calories (don't even bother continuing this path)
                    if (currentCal > remainingCal + MAX_OVERAGE_HARD) break;

                    // --- SELECTION WEIGHTING ---
                    // We want to pick items that fit the "Need".
                    // If we need Protein badly but have low Cals -> Pick High Efficiency
                    // If we need Cals but Protein is fine -> Pick Low Efficiency (Carbs/Fats)
                    
                    const urgencyPro = Math.max(0, needPro);
                    const budgetCal = Math.max(50, needCal); // avoid div by zero
                    const targetEfficiency = urgencyPro / budgetCal;

                    // Pick a random item, but favor those closer to targetEfficiency
                    // We use a simple tournament selection or weighted random for speed.
                    // Let's use a simplified approach: 
                    // 50% chance to pick from top 50% most efficient items if we need protein.
                    
                    let candidate = pool[Math.floor(Math.random() * pool.length)];
                    
                    // Bias: If we really need protein, retry if we picked a low-protein item
                    if (targetEfficiency > 0.1 && candidate.efficiency < 0.05) {
                        // Retry once to bias towards protein
                        candidate = pool[Math.floor(Math.random() * pool.length)];
                    }

                    // Soft check: Don't add if it blows budget excessively immediately 
                    // (unless it's the first item, or we are desperate)
                    if (currentCombo.length > 0 && (currentCal + candidate.cal > remainingCal + MAX_OVERAGE_HARD)) {
                        continue; 
                    }
                    
                    // Cap duplicates at 10 (hard limit from req)
                    if ((counts[candidate.id] || 0) >= 10) continue;

                    currentCombo.push(candidate);
                    currentCal += candidate.cal;
                    currentPro += candidate.pro;
                    counts[candidate.id] = (counts[candidate.id] || 0) + 1;
                }

                if (currentCombo.length === 0) continue;

                // 2. SCORE THE PLATE (Lower is better)
                let score = 0;
                const finalCal = currentCal;
                const finalPro = currentPro;

                // A. Protein Score
                const missingPro = Math.max(0, remainingPro - finalPro);
                if (mode !== 'cal') {
                    // Huge penalty for missing protein
                    score += missingPro * PENALTY_MISSED_PRO;
                }

                // B. Calorie Score
                const diffCal = finalCal - remainingCal;
                if (diffCal > 0) {
                    // Overeating is bad. 
                    // Quadratic penalty: 50 over = 2500 * 0.05 + 500 = 625
                    // 400 over = 160000 * 0.05 + 4000 = 12000 (Huge!)
                    score += (diffCal * PENALTY_PER_CAL_OVER) + (Math.pow(diffCal, 2) * PENALTY_PER_CAL_OVER_SQ);
                } else {
                    // Undereating is okay, but we want to get close
                    score += Math.abs(diffCal) * 2; 
                }

                // C. Duplicate Penalty (Variety)
                const uniqueItems = new Set(currentCombo.map(i => i.id)).size;
                const duplicateCount = currentCombo.length - uniqueItems;
                score += duplicateCount * PENALTY_DUPLICATE;

                // D. Empty check (sanity)
                if (currentCombo.length === 0) score = Infinity;

                // 3. UPDATE BEST
                if (score < bestScore) {
                    bestScore = score;
                    bestCombo = currentCombo;
                }
            }

            setSuggestions(bestCombo);
            setTotals(bestCombo.reduce((acc, item) => ({ cal: acc.cal + item.cal, pro: acc.pro + item.pro }), { cal: 0, pro: 0 }));
            setIsLoading(false);
        }, 50);
    };

    useEffect(() => {
        if (isOpen) {
            generate();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[32px] shadow-2xl w-full max-w-sm animate-pop-in max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-100 p-2 rounded-xl text-yellow-600">
                            <Flame className="w-5 h-5" filled />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Smart Suggestion</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                <div className="mb-4 shrink-0">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Remaining Goal</div>
                    <div className="flex items-center gap-4">
                        <div className="font-black text-2xl text-gray-800">{remainingCal > 0 ? remainingCal : 0} <span className="text-sm text-gray-400 font-bold">kcal</span></div>
                        <div className="w-px h-6 bg-gray-200"></div>
                        <div className="font-black text-2xl text-protein">{remainingPro > 0 ? remainingPro : 0} <span className="text-sm text-gray-400 font-bold">g</span></div>
                    </div>
                </div>

                {/* Suggestions List */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 mb-4">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                        </div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="bg-white border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                <div>
                                    <div className="font-bold text-gray-800">{item.label}</div>
                                    <div className="text-xs text-gray-500">{item.cal} kcal • {item.pro}g pro</div>
                                </div>
                                <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                                    ✓
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            Couldn't find a good combination from your saved meals to fit this gap. Try creating more presets!
                        </div>
                    )}
                </div>

                {/* Result Summary */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 shrink-0 border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-500">SUGGESTED TOTAL</span>
                        <button onClick={generate} className="text-xs font-bold text-accent hover:underline">Regenerate</button>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-xl font-black ${totals.cal > remainingCal + 100 ? 'text-red-500' : 'text-gray-800'}`}>
                            {totals.cal}
                        </span>
                        <span className="text-xs font-bold text-gray-400">kcal</span>
                        
                        <span className="mx-2 text-gray-300">|</span>

                        <span className={`text-xl font-black ${Math.abs(remainingPro - totals.pro) > 10 ? 'text-indigo-400' : 'text-protein'}`}>
                            {totals.pro}
                        </span>
                        <span className="text-xs font-bold text-gray-400">pro</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 shrink-0">
                    <button 
                        onClick={onClose}
                        className="py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            if (suggestions.length > 0) {
                                onLogSuggestions(suggestions);
                                onClose();
                            }
                        }}
                        disabled={suggestions.length === 0}
                        className={`py-3 rounded-2xl font-bold text-white transition shadow-lg ${suggestions.length > 0 ? 'bg-black active:scale-95' : 'bg-gray-300'}`}
                    >
                        Log All
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuggestionModal;