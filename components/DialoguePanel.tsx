import React, { useEffect, useState } from 'react';
import { ChevronRight, Play } from 'lucide-react';

interface DialoguePanelProps {
    started: boolean;
    text: string;
    type: 'INTRO' | 'INFO' | 'QUIZ' | 'VICTORY';
    onStart?: () => void;
    quizOptions?: { label: string; value: any; isCorrect?: boolean }[];
    onQuizAnswer?: (index: number) => void;
    extraContent?: React.ReactNode;
}

export default function DialoguePanel({
    started,
    text,
    type,
    onStart,
    quizOptions,
    onQuizAnswer,
    extraContent
}: DialoguePanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Auto-expand on new text, but debounce slightly to avoid jarring layout shifts
    useEffect(() => {
        setIsExpanded(true);
    }, [text, type]);

    // If not started, full screen modal
    if (!started) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-500">
                <div className="bg-slate-900 border border-purple-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-purple-900/50 text-center relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-purple-600/20 blur-3xl -z-10"></div>

                    <div className="text-6xl mb-6 animate-bounce">🧙‍♂️</div>
                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
                        World of Two Mirrors
                    </h1>
                    <p className="text-slate-300 mb-8 leading-relaxed">
                        {text}
                    </p>

                    <button
                        onClick={onStart}
                        className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-purple-600 font-lg rounded-full hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] active:scale-95"
                    >
                        <span className="mr-2">Start Journey</span>
                        <Play size={20} className="fill-current" />
                    </button>
                </div>
            </div>
        );
    }

    // In-Game Panel
    return (
        <div
            className={`absolute bottom-4 right-4 z-40 flex flex-col items-end transition-all duration-300 pointer-events-none ${isExpanded ? 'max-w-md w-full' : 'w-auto'}`}
        >
            {/* Helper to toggle state if needed, though strictly we might just want it always open or smart-collapsed */}
            {/* For now, just the panel */}

            <div className="bg-slate-900/95 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-2xl shadow-purple-900/20 w-full pointer-events-auto animate-in slide-in-from-bottom fade-in duration-300">
                <div className="flex gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-purple-900/50 flex items-center justify-center border border-purple-500 text-2xl">
                            🧙‍♂️
                        </div>
                    </div>

                    <div className="flex-1 space-y-3">
                        <div className="text-purple-200 text-sm md:text-base leading-relaxed font-medium">
                            {text}
                        </div>

                        {extraContent && (
                            <div className="mt-2 bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                                {extraContent}
                            </div>
                        )}

                        {type === 'QUIZ' && quizOptions && (
                            <div className="grid grid-cols-1 gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                                {quizOptions.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onQuizAnswer && onQuizAnswer(opt.value)}
                                        className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-purple-600/20 border border-slate-700 hover:border-purple-500 text-slate-200 transition-all font-medium flex items-center group"
                                    >
                                        <span className="w-6 h-6 rounded-full border border-slate-500 group-hover:border-purple-400 flex items-center justify-center text-xs mr-3 text-slate-500 group-hover:text-purple-400 font-mono">
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        {opt.label}
                                        <ChevronRight className="ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
