import React, { useState, useEffect, useCallback, useMemo } from 'react';
import OpticalBench from './components/OpticalBench';
import ControlPanel from './components/ControlPanel';
import { calculateRayPath, degToRad } from './utils/geometry';
import { Mirror } from './types';
import { Gem, Play, CheckCircle2, RotateCcw, Target, X } from 'lucide-react';

// --- Game Constants & Types ---
type ChallengeId = 1 | 2 | 3 | 4; // 1: One Refl, 2: Two Refl, 3: Retro-Refl, 4: Done

interface GameState {
  started: boolean;
  challenge: ChallengeId;
  jewels: number;
  c1Progress: {
    methodA: boolean; // Angle of light > 90 (Left of normal)
    methodB: boolean; // Mirror Angle > Light Angle (Escaping)
  };
}

const WIZARD_MESSAGES = {
  intro: "Welcome, seeker of light! I am the Arcane Optician. Prove your mastery over the twin mirrors to earn the Royal Jewels.",
  c1_start: "Your first challenge: Tame the light to bounce exactly ONCE. There are TWO distinct ways to do this. Find them both!",
  c1_progress: "Brilliant! You found one way. Now, find the other path to single reflection.",
  c2_start: "Excellent work! Now, bend the light to bounce exactly TWICE.",
  c3_start: "You are a master! Final challenge: Create a Retro-Reflector. Make the light go BACK the way it came (parallel to source) after 2 reflections.",
  complete: "Magnificent! A 90-degree corner reflects light back to its source. You have claimed all the jewels!",
};

export default function App() {
  // Initial state setup to NOT be 1 reflection (Mirror 50, Source 60 -> 2 reflections)
  const [mirrorAngle, setMirrorAngle] = useState(50);
  const [incidentAngle, setIncidentAngle] = useState(60);

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    started: false,
    challenge: 1,
    jewels: 0,
    c1Progress: { methodA: false, methodB: false },
  });

  const [wizardText, setWizardText] = useState(WIZARD_MESSAGES.intro);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showGoal, setShowGoal] = useState(false);

  // --- Physics Simulation (Memoized) ---
  const simulation = useMemo(() => {
    if (!gameState.started) return null;

    const infiniteLength = 50000;
    const m1End = { x: infiniteLength, y: 0 };
    const m2End = {
      x: infiniteLength * Math.cos(degToRad(mirrorAngle)),
      y: infiniteLength * Math.sin(degToRad(mirrorAngle)),
    };
    const mirrors: Mirror[] = [
      { start: { x: 0, y: 0 }, end: m1End, angle: 0, id: 'm1' },
      { start: { x: 0, y: 0 }, end: m2End, angle: mirrorAngle, id: 'm2' },
    ];

    const handleRadius = 100;
    const fixedIncidentDist = handleRadius * 0.6;
    const sourceDist = handleRadius * 0.3;
    const incidentPoint = { x: fixedIncidentDist, y: 0 };
    const sourcePos = {
      x: incidentPoint.x + sourceDist * Math.cos(degToRad(incidentAngle)),
      y: incidentPoint.y + sourceDist * Math.sin(degToRad(incidentAngle)),
    };

    const rayDirVector = {
      x: incidentPoint.x - sourcePos.x,
      y: incidentPoint.y - sourcePos.y
    };
    const rayAngle = (Math.atan2(rayDirVector.y, rayDirVector.x) * 180) / Math.PI;

    const { path } = calculateRayPath(sourcePos, rayAngle, mirrors);
    const reflectionCount = Math.max(0, path.length - 2);

    return { path, reflectionCount, rayDirVector, rayAngle };
  }, [mirrorAngle, incidentAngle, gameState.started]);



  // --- Effect 2: Game Logic Check (Debounced) ---
  useEffect(() => {
    if (!simulation || gameState.challenge === 4) return;

    const timer = setTimeout(() => {
      const { reflectionCount, path, rayDirVector } = simulation;

      // 2. Evaluate Challenges
      if (gameState.challenge === 1) {
        if (reflectionCount === 1) {
          let updateNeeded = false;
          const newProgress = { ...gameState.c1Progress };

          // Method A: Left of Normal (Source > 90)
          if (incidentAngle > 90 && !newProgress.methodA) {
            newProgress.methodA = true;
            updateNeeded = true;
            triggerToast("Discovered: The Path Away!");
          }

          // Method B: Wide Angle
          if (incidentAngle <= 90 && !newProgress.methodB) {
            newProgress.methodB = true;
            updateNeeded = true;
            triggerToast("Discovered: The Open Door!");
          }

          if (updateNeeded) {
            if (newProgress.methodA && newProgress.methodB) {
              setGameState(prev => ({
                ...prev,
                challenge: 2,
                jewels: prev.jewels + 1,
                c1Progress: newProgress
              }));
              setWizardText(WIZARD_MESSAGES.c2_start);
              triggerToast("Challenge 1 Complete! +1 Jewel 💎");
            } else {
              setGameState(prev => ({ ...prev, c1Progress: newProgress }));
              setWizardText(WIZARD_MESSAGES.c1_progress);
            }
          }
        }
      } else if (gameState.challenge === 2) {
        if (reflectionCount === 2) {
          setGameState(prev => ({
            ...prev,
            challenge: 3,
            jewels: prev.jewels + 1
          }));
          setWizardText(WIZARD_MESSAGES.c3_start);
          triggerToast("Challenge 2 Complete! +1 Jewel 💎");
        }
      } else if (gameState.challenge === 3) {
        if (reflectionCount >= 2 && path.length >= 2) {
          const lastPt = path[path.length - 1];
          const prevPt = path[path.length - 2];
          const lastDx = lastPt.x - prevPt.x;
          const lastDy = lastPt.y - prevPt.y;

          const lenInit = Math.sqrt(rayDirVector.x ** 2 + rayDirVector.y ** 2);
          const nxInit = rayDirVector.x / lenInit;
          const nyInit = rayDirVector.y / lenInit;

          const lenFinal = Math.sqrt(lastDx ** 2 + lastDy ** 2);
          const nxFinal = lastDx / lenFinal;
          const nyFinal = lastDy / lenFinal;

          const dot = nxInit * nxFinal + nyInit * nyFinal;

          if (dot < -0.99) {
            setGameState(prev => ({
              ...prev,
              challenge: 4,
              jewels: prev.jewels + 1
            }));
            setWizardText(WIZARD_MESSAGES.complete);
            triggerToast("Grand Master! +1 Jewel 💎");
          }
        }
      }
    }, 500); // Debounce delay

    return () => clearTimeout(timer);
  }, [simulation, gameState.challenge, gameState.c1Progress, incidentAngle, setGameState, setWizardText]);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // --- Effect 3: Auto-Show Goal on Level Start ---
  useEffect(() => {
    if (gameState.started && gameState.challenge !== 4) {
      // Delay: 3.2s if leveling up (wait for toast), 0.5s if just starting
      const delay = gameState.challenge === 1 ? 500 : 3200;

      const showTimer = setTimeout(() => {
        setShowGoal(true);
      }, delay);

      const hideTimer = setTimeout(() => {
        setShowGoal(false);
      }, delay + 8000); // Hide 8s after showing

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [gameState.started, gameState.challenge]);

  const startGame = () => {
    setGameState(prev => ({ ...prev, started: true }));
    setWizardText(WIZARD_MESSAGES.c1_start);
  };

  const resetGame = () => {
    setMirrorAngle(130);
    setIncidentAngle(60);
    setGameState({
      started: false,
      challenge: 1,
      jewels: 0,
      c1Progress: { methodA: false, methodB: false },
    });
    setWizardText(WIZARD_MESSAGES.intro);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden font-sans">

      {/* --- Game HUD --- */}
      {gameState.started && (
        <div className="absolute top-4 right-4 z-30 pointer-events-none flex flex-col items-end gap-2">

          {/* Goal Button & Jewels (Compact) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full px-3 py-1 flex items-center gap-2">
              <Gem className="text-cyan-400 w-4 h-4 fill-cyan-400/20" />
              <span className="font-bold font-mono text-lg">{gameState.jewels}</span>
            </div>

            <button
              onClick={() => setShowGoal(!showGoal)}
              className={`px-3 py-1 rounded-full border transition-all duration-300 shadow-lg ${showGoal ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900/80 border-purple-500/50 text-purple-400 hover:bg-slate-800'}`}
            >
              {showGoal ? "Close" : "Goal"}
            </button>
          </div>

          {/* Goal/Wizard Content (Toggled) */}
          {showGoal && (
            <div className="bg-slate-900/90 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-xl shadow-purple-900/20 w-64 md:w-80 pointer-events-auto animate-in slide-in-from-right fade-in duration-200 origin-top-right">
              <div className="flex items-start gap-3">
                <div className="text-2xl pt-1">🧙‍♂️</div>
                <p className="text-purple-200 text-sm leading-tight flex-1">
                  {wizardText}
                </p>
              </div>

              {/* Objective Tracker */}
              {gameState.challenge === 1 && (
                <div className="mt-3 flex flex-col gap-2 text-xs font-bold">
                  <div className={`px-2 py-1 rounded-full border flex items-center gap-2 transition-colors ${gameState.c1Progress.methodA ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}>
                    {gameState.c1Progress.methodA ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
                    Path Away
                  </div>
                  <div className={`px-2 py-1 rounded-full border flex items-center gap-2 transition-colors ${gameState.c1Progress.methodB ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}>
                    {gameState.c1Progress.methodB ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
                    Open Door
                  </div>
                </div>
              )}

              {gameState.challenge === 2 && (
                <div className="mt-3 px-3 py-1 rounded-full border bg-slate-800/50 border-yellow-500/50 text-yellow-400 text-xs font-bold animate-pulse text-center">
                  Goal: Exactly 2 Reflections
                </div>
              )}

              {gameState.challenge === 3 && (
                <div className="mt-3 px-3 py-1 rounded-full border bg-slate-800/50 border-cyan-500/50 text-cyan-400 text-xs font-bold animate-pulse text-center">
                  Goal: Return to Source (Retro-reflect)
                </div>
              )}
            </div>
          )}

          {/* Completion Banner */}
          {gameState.challenge === 4 && (
            <div className="mt-2 bg-gradient-to-r from-yellow-600 to-yellow-800 text-white px-4 py-2 rounded-full font-bold shadow-xl flex items-center gap-2 animate-in slide-in-from-top fade-in duration-700 pointer-events-auto">
              <Gem className="fill-white w-4 h-4" />
              <span className="text-sm">All Jewels!</span>
              <button onClick={resetGame} className="ml-auto p-1 bg-white/20 rounded-full hover:bg-white/30" title="Restart">
                <RotateCcw size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- Toast Notification --- */}
      {showToast && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300">
          <div className="bg-cyan-500 text-slate-900 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)] font-bold flex items-center gap-2">
            <Gem size={20} className="fill-slate-900" />
            {showToast}
          </div>
        </div>
      )}

      {/* --- Intro Modal --- */}
      {!gameState.started && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-purple-900/50 text-center relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-purple-600/20 blur-3xl -z-10"></div>

            <div className="text-6xl mb-6">🧙‍♂️</div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
              World of Two Mirrors
            </h1>
            <p className="text-slate-300 mb-8 leading-relaxed">
              {WIZARD_MESSAGES.intro}
            </p>

            <button
              onClick={startGame}
              className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-purple-600 font-lg rounded-full hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] active:scale-95"
            >
              <span className="mr-2">Start Journey</span>
              <Play size={20} className="fill-current" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 relative">
        <OpticalBench
          mirrorAngle={mirrorAngle}
          setMirrorAngle={setMirrorAngle}
          incidentAngle={incidentAngle}
          setIncidentAngle={setIncidentAngle}
        />
      </main>
      <ControlPanel
        mirrorAngle={mirrorAngle}
        setMirrorAngle={setMirrorAngle}
        incidentAngle={incidentAngle}
        setIncidentAngle={setIncidentAngle}
      />
    </div>
  );
}
