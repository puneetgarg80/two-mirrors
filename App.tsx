import React, { useState, useEffect, useMemo } from 'react';
import OpticalBench from './components/OpticalBench';
import ControlPanel from './components/ControlPanel';
import DialoguePanel from './components/DialoguePanel';
import { calculateRayPath, degToRad } from './utils/geometry';
import { Mirror } from './types';
import { Gem, CheckCircle2, RotateCcw } from 'lucide-react';

// --- Game Constants & Types ---
type ChallengeId = 1 | 2 | 3 | 4 | 5 | 6 | 7; // ... 4: Constancy Check, 5: Test Other Angles, 6: Theory Quiz, 7: Done

interface GameState {
  started: boolean;
  challenge: ChallengeId;
  jewels: number;
  c1Progress: {
    methodA: boolean; // Angle of light > 90 (Left of normal)
    methodB: boolean; // Mirror Angle > Light Angle (Escaping)
  };
  c4StartAngle?: number; // Snapshot of incident for C4
  c5StartAngle?: number; // Snapshot of incident for C5
  c5MirrorAngle?: number; // Snapshot of mirror for C5
}

const WIZARD_MESSAGES = {
  intro: "Welcome, seeker of light! I am the Arcane Optician. Prove your mastery over the twin mirrors to earn the Royal Jewels.",
  c1_start: "Your first challenge: Tame the light to bounce exactly ONCE. There are TWO distinct ways to do this. Find them both!",
  c1_progress: "Brilliant! You found one way. Now, find the other path to single reflection.",
  c2_start: "Excellent work! Now, bend the light to bounce exactly TWICE.",
  c3_start: "You are a master! Final challenge: Create a Parallel-Reflector. Adjust the mirrors so the final ray is PARALLEL to the incident ray after exactly 2 reflections.",
  c4_start: "Remarkable! You found the 90° corner. Now, KEEP the mirror at 90° and CHANGE the light source angle. Observe what happens to the deviation.",
  c4_quiz: "You changed the incident angle while keeping the mirrors at 90°. Does the deviation angle change?",
  c5_start: "Interesting... the deviation stayed constant at 180°. Does this rule hold for OTHER angles? Set the mirror to roughly 60°. Then move the light to check constancy.",
  c5_quiz: "You tested 90° and 60°. In a 2-reflection system, the total deviation depends on:",
  complete: "Magnificent! You have discovered the General Law: For 2 reflections, Total Deviation depends ONLY on the Mirror Angle (D = 360 - 2θ). You are a true Optic Master!",
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
  const [quizTriggered, setQuizTriggered] = useState(false); // Helper to switch Dialogue to Quiz Mode

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


  // --- Logic Check ---
  useEffect(() => {
    if (!simulation || gameState.challenge === 7) return;

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
        if (reflectionCount === 2 && path.length >= 2) {
          const lastPt = path[path.length - 1];
          const prevPt = path[path.length - 2];
          const lastDx = lastPt.x - prevPt.x;
          const lastDy = lastPt.y - prevPt.y;

          const lenInit = Math.sqrt(rayDirVector.x ** 2 + rayDirVector.y ** 2);
          const nxInit = rayDirVector.x / lenInit;
          const nyInit = rayDirVector.y / lenInit;

          const nxFinal = lastDx / Math.sqrt(lastDx ** 2 + lastDy ** 2);
          const nyFinal = lastDy / Math.sqrt(lastDx ** 2 + lastDy ** 2);

          const dot = nxInit * nxFinal + nyInit * nyFinal;

          if (dot < -0.99 && Math.round(mirrorAngle) === 90) {
            setGameState(prev => ({
              ...prev,
              challenge: 4,
              c4StartAngle: incidentAngle, // Store snapshot
              jewels: prev.jewels + 1
            }));
            setWizardText(WIZARD_MESSAGES.c4_start);
            setQuizTriggered(false); // Reset quiz state for next challenge
            triggerToast("Part 1 Complete! Now Observe... 👁️");
          }
        }
      } else if (gameState.challenge === 4) {
        // Enforce staying at 90 degrees
        if (Math.round(mirrorAngle) !== 90) {
          // User moved mirror away from 90.
        } else {
          // Check if they moved the light source significantly
          const startAngle = gameState.c4StartAngle ?? incidentAngle;
          const diff = Math.abs(incidentAngle - startAngle);
          if (diff > 20 && !quizTriggered) {
            setQuizTriggered(true); // Trigger Quiz 1
          }
        }
      } else if (gameState.challenge === 5) {
        // Goal: Set mirror to ~60 (+/- 5), then move source
        const targetAngle = 60;
        if (Math.abs(mirrorAngle - targetAngle) <= 5) {
          // They are in the target range.
          // Have they moved the source while IN this range?

          // Correct initialization of tracking state if not set or if mirror moved significantly
          if (gameState.c5MirrorAngle === undefined || Math.abs(gameState.c5MirrorAngle - mirrorAngle) > 2) {
            // Reset baseline if mirror changed
            setGameState(prev => ({ ...prev, c5MirrorAngle: mirrorAngle, c5StartAngle: incidentAngle }));
          } else {
            // Check Source Movement
            const startIncident = gameState.c5StartAngle ?? incidentAngle;
            const diff = Math.abs(incidentAngle - startIncident);

            if (diff > 20 && !quizTriggered) {
              setQuizTriggered(true); // Trigger Quiz 2
            }
          }
        }
      }
      // Challenge 6 is the Quiz state itself
    }, 500); // Reasonably fast debounce

    return () => clearTimeout(timer);
  }, [simulation, gameState.challenge, gameState.c1Progress, incidentAngle, setGameState, setWizardText, mirrorAngle, quizTriggered, gameState.c5MirrorAngle, gameState.c5StartAngle, gameState.c4StartAngle]);

  const handleQuizAnswer = (answerIndex: number) => {
    setQuizTriggered(false); // Hide quiz after answer

    if (gameState.challenge === 4) { // Quiz 1: Constancy Check
      const isCorrect = answerIndex === 0; // 0 = No (Correct), 1 = Yes
      if (isCorrect) {
        setGameState(prev => ({
          ...prev,
          challenge: 5,
          jewels: prev.jewels + 1
        }));
        setWizardText(WIZARD_MESSAGES.c5_start);
        triggerToast("Correct! Next: The General Case 🤔");
      } else {
        triggerToast("Incorrect. Watch the deviation value closely!");
      }
    } else if (gameState.challenge === 5) { // Quiz 2: General Theory triggered from C5
      // Quiz 2 Logic
      // Options: 0: Incident, 1: Mirror (Correct), 2: Both
      const isCorrect = answerIndex === 1;

      if (isCorrect) {
        setGameState(prev => ({
          ...prev,
          challenge: 7,
          jewels: prev.jewels + 1
        }));
        setWizardText(WIZARD_MESSAGES.complete);
        triggerToast("Grand Master! +1 Jewel 💎");
      } else {
        triggerToast("Incorrect. Think about what truly changed the deviation.");
      }
    }
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

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
    setQuizTriggered(false);
  };

  // --- Dialogue Props Preparation ---
  const dialogueProps = {
    started: gameState.started,
    type: (gameState.challenge === 7 ? 'VICTORY' : (quizTriggered ? 'QUIZ' : 'INFO')) as 'INTRO' | 'INFO' | 'QUIZ' | 'VICTORY',
    text: quizTriggered
      ? (gameState.challenge === 4 ? WIZARD_MESSAGES.c4_quiz : WIZARD_MESSAGES.c5_quiz)
      : wizardText,
    onStart: startGame,
    onQuizAnswer: handleQuizAnswer,
    quizOptions: quizTriggered
      ? (gameState.challenge === 4
        ? [{ label: "No, it stays 180°", value: 0 }, { label: "Yes, it changes", value: 1 }]
        : [{ label: "Incident Angle Only", value: 0 }, { label: "Mirror Angle Only", value: 1 }, { label: "Both Angles", value: 2 }]
      )
      : undefined,
    extraContent: (
      <>
        {gameState.challenge === 1 && (
          <div className="flex flex-col gap-1 text-xs font-bold">
            <div className={`flex items - center gap - 2 ${gameState.c1Progress.methodA ? 'text-green-400' : 'text-slate-500'} `}>
              {gameState.c1Progress.methodA ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
              &nbsp; Path Away
            </div>
            <div className={`flex items - center gap - 2 ${gameState.c1Progress.methodB ? 'text-green-400' : 'text-slate-500'} `}>
              {gameState.c1Progress.methodB ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
              &nbsp; Open Door
            </div>
          </div>
        )}
        {gameState.challenge === 7 && (
          <button onClick={resetGame} className="px-2 py-1 bg-yellow-600 text-white rounded-full font-bold flex items-center gap-1 hover:bg-yellow-500 transition-colors">
            <RotateCcw size={16} /> Play Again
          </button>
        )}
      </>
    )
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden font-sans">

      {/* --- Game HUD (Jewels Only) --- */}
      {gameState.started && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full px-3 py-1 flex items-center gap-2">
            <Gem className="text-cyan-400 w-4 h-4 fill-cyan-400/20" />
            <span className="font-bold font-mono text-lg">{gameState.jewels}</span>
          </div>
        </div>
      )}

      {/* --- Unified Dialogue Panel --- */}
      <DialoguePanel {...dialogueProps} />

      {/* --- Toast Notification --- */}
      {showToast && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300 pointer-events-none">
          <div className="bg-cyan-500 text-slate-900 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)] font-bold flex items-center gap-2 pointer-events-auto">
            <Gem size={20} className="fill-slate-900" />
            {showToast}
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
