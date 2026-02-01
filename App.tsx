import React, { useState, useEffect, useMemo } from 'react';
import OpticalBench from './components/OpticalBench';
import ControlPanel from './components/ControlPanel';
import DialoguePanel from './components/DialoguePanel';
import { calculateRayPath, degToRad } from './utils/geometry';
import { Mirror, HighlightTarget } from './types';
import { Gem, CheckCircle2, RotateCcw, Star, ChevronRight } from 'lucide-react';

// --- Game Constants & Types ---
type ChallengeId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0: Tutorial, ... 4: Constancy Check, 5: Test Other Angles, 6: Theory Quiz, 7: Done

interface GameState {
  started: boolean;
  challenge: ChallengeId;
  tutorialStep: number;
  jewels: number;
  points: number;
  c1Progress: {
    methodA: boolean; // Angle of light > 90 (Left of normal)
    methodB: boolean; // Mirror Angle > Light Angle (Escaping)
  };
  c4StartAngle?: number; // Snapshot of incident for C4
  c5StartAngle?: number; // Snapshot of incident for C5
  c5MirrorAngle?: number; // Snapshot of mirror for C5
}

interface TutorialStep {
  message: string;
  highlight?: HighlightTarget;
}

const WIZARD_TUTORIAL_STEPS: TutorialStep[] = [
  { message: "Twin Mirrors (green lines) bend light.", highlight: 'mirrors' },
  { message: "Turn Mirror M2 by dragging the blue dot.", highlight: 'mirrorControl' },
  { message: "Move the Sun (yellow circle) by dragging it.", highlight: 'sourceControl' },
  { message: "Or use these buttons for fine control.", highlight: 'mirrorButton' },
  { message: "Goal: Discover the laws of reflection to win Jewels!", highlight: undefined }
];

const WIZARD_MESSAGES = {
  intro: "Welcome! Master the twin mirrors to earn the Royal Jewels.",
  c1_start: "Challenge 1: Make the light reflect exactly ONCE. <br/> Hint: Try moving the light source and/or mirror.",
  c1_progress: "Great! Now find the second way to get one reflection.",
  c2_start: "Challenge 2: Make the light reflect exactly TWO times.",
  c3_start: "Challenge 3: Create a Parallel-Reflector. <br/> Final ray must be PARALLEL to starting ray (<b> Deviation = 180° </b>) after <b> 2 reflections </b>.",
  c4_start: "Found it! Now KEEP mirror at 90° and MOVE the Light Source. Does Deviation change?",
  c4_quiz: "Mirror at 90°, light moved. Did <b> Deviation </b> change?",
  c5_start: "It stayed constant! Does this happen for <b> ANY angle </b>? Set Mirror to <b> 110° </b> and move the Light.",
  c5_quiz: "In a 2-reflection system, Total Deviation depends on:",
  complete: "You found the secret! Total Deviation depends ONLY on the Mirror Angle!",
  c1_hint_A: "One way found! <br /> Try moving the Light Source away from M2 and increase Mirror angle.",
  c1_hint_B: "One way found! <br /> Try moving the Light Source towards M2.",
  toast_discovered_way: "Discovered a way! +10 Points",
};

export default function App() {
  // Initial state setup to NOT be 1 reflection (Mirror 50, Source 60 -> 2 reflections)
  const [mirrorAngle, setMirrorAngle] = useState(50);
  const [incidentAngle, setIncidentAngle] = useState(60);
  const [sourceDist, setSourceDist] = useState(100 * 0.3);
  const [handleRadius, setHandleRadius] = useState(100);
  const [mirrorOrigin, setMirrorOrigin] = useState<{ x: number; y: number } | null>(null);


  // Game State
  const [gameState, setGameState] = useState<GameState>({
    started: false,
    challenge: 1,
    tutorialStep: 0,
    jewels: 0,
    points: 0,
    c1Progress: { methodA: false, methodB: false },
  });

  const [wizardText, setWizardText] = useState(WIZARD_MESSAGES.intro);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [quizTriggered, setQuizTriggered] = useState(false); // Helper to switch Dialogue to Quiz Mode

  // Derive Highlight based on current tutorial step
  const activeHighlight: HighlightTarget | null = (gameState.challenge === 0)
    ? (WIZARD_TUTORIAL_STEPS[gameState.tutorialStep]?.highlight || null)
    : null;

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

    // Handle Radius from State
    const fixedIncidentDist = handleRadius * 0.6;
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

    // console.log('Source Position:', sourcePos, 'Distance:', sourceDist);

    return { path, reflectionCount, rayDirVector, rayAngle };
  }, [mirrorAngle, incidentAngle, sourceDist, handleRadius, gameState.started]);


  // --- Logic Check (Triggered on Interaction End) ---
  const handleInteractionEnd = () => {
    if (!simulation || gameState.challenge === 7) return;

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
          setGameState(prev => ({ ...prev, points: prev.points + 10 }));
          triggerToast(WIZARD_MESSAGES.toast_discovered_way);
        }

        // Method B: Wide Angle
        if (incidentAngle <= 90 && !newProgress.methodB) {
          newProgress.methodB = true;
          updateNeeded = true;
          setGameState(prev => ({ ...prev, points: prev.points + 10 }));
          triggerToast("Discovered a way! +10 Points");
        }

        if (updateNeeded) {
          // Check if this was the FIRST discovery (i.e., before this update, both were false)
          // We can check if now exactly ONE is true.
          const methodsFound = (newProgress.methodA ? 1 : 0) + (newProgress.methodB ? 1 : 0);

          if (methodsFound === 1) {
            // First discovery! Auto-stay and show hint.
            setGameState(prev => ({ ...prev, c1Progress: newProgress }));

            if (newProgress.methodA) {
              // Found A (>90), need B (<=90)
              setWizardText(WIZARD_MESSAGES.c1_hint_A);
            } else {
              // Found B (<=90), need A (>90)
              setWizardText(WIZARD_MESSAGES.c1_hint_B);
            }
          } else if (methodsFound === 2) {
            // Found both! Auto-advance.
            setGameState(prev => ({
              ...prev,
              challenge: 2,
              // No jewels for Challenge 1
              // No bonus points for Challenge 1 completion, just the 10+10 already awarded
              c1Progress: newProgress
            }));
            setWizardText(WIZARD_MESSAGES.c2_start);
            // triggerToast("Challenge 1 Complete!");
          }
        }
      }
    } else if (gameState.challenge === 2) {
      if (reflectionCount === 2) {
        setGameState(prev => ({
          ...prev,
          challenge: 3,
          points: prev.points + 10
        }));
        setWizardText(WIZARD_MESSAGES.c3_start);
        // triggerToast("Challenge 2 Complete! +10 Points");
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
            points: prev.points + 10
          }));
          setWizardText(WIZARD_MESSAGES.c4_start);
          setQuizTriggered(false); // Reset quiz state for next challenge
          // triggerToast("Part 1 Complete! +10 Points");
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
        if (diff > 10 && !quizTriggered) {
          setQuizTriggered(true); // Trigger Quiz 1
        }
      }
    } else if (gameState.challenge === 5) {
      // Goal: Set mirror to ~60 (+/- 5), then move source
      const targetAngle = 110;
      if (Math.abs(mirrorAngle - targetAngle) <= 5) {
        // They are in the target range.
        // Have they moved the source while IN this range?

        // Correct initialization of tracking state if not set or if mirror moved significantly
        if (gameState.c5MirrorAngle === undefined || Math.abs(gameState.c5MirrorAngle - mirrorAngle) > 2) {
          // Reset baseline if mirror changed
          setGameState(prev => ({ ...prev, c5MirrorAngle: mirrorAngle, c5StartAngle: incidentAngle }));
          // triggerToast(`Mirror Set at ${Math.round(mirrorAngle)}°! Now move the Source.`);
        } else {
          // Check Source Movement
          const startIncident = gameState.c5StartAngle ?? incidentAngle;
          const diff = Math.abs(incidentAngle - startIncident);

          if (diff > 10 && !quizTriggered) {
            setQuizTriggered(true); // Trigger Quiz 2
          }
        }
      }
    }
  };

  const handleQuizAnswer = (answerIndex: number) => {
    setQuizTriggered(false); // Hide quiz after answer

    if (gameState.challenge === 4) { // Quiz 1: Constancy Check
      const isCorrect = answerIndex === 0; // 0 = No (Correct), 1 = Yes
      if (isCorrect) {
        setGameState(prev => ({
          ...prev,
          challenge: 5,
          points: prev.points + 10
        }));
        setWizardText(WIZARD_MESSAGES.c5_start);
        // triggerToast("Correct! Next: The General Case 🤔");
      } else {
        // triggerToast("Incorrect. Watch the deviation value closely!");
      }
    } else if (gameState.challenge === 1) { // Challenge 1 Choice
      const choice = answerIndex; // 0 = Find 2nd Way, 1 = Move Next
      if (choice === 1) {
        // Move to Challenge 2
        setGameState(prev => ({
          ...prev,
          challenge: 2
        }));
        setWizardText(WIZARD_MESSAGES.c2_start);
        // triggerToast("Moving to Challenge 2!");
      } else {
        // Stay and find 2nd way
        if (gameState.c1Progress.methodA) {
          // Found A (>90), need B (<=90)
          setWizardText(WIZARD_MESSAGES.c1_hint_A);
        } else {
          // Found B (<=90), need A (>90)
          setWizardText(WIZARD_MESSAGES.c1_hint_B);
        }
      }
    } else if (gameState.challenge === 5) { // Quiz 2: General Theory triggered from C5
      // Quiz 2 Logic
      // Options: 0: Incident, 1: Mirror (Correct), 2: Both
      const isCorrect = answerIndex === 1;

      if (isCorrect) {
        setGameState(prev => ({
          ...prev,
          challenge: 7,
          jewels: prev.jewels + 1,
          points: prev.points + 100
        }));
        setWizardText(WIZARD_MESSAGES.complete);
        // triggerToast("Grand Master! +1 Jewel 💎");
      } else {
        // triggerToast("Incorrect. Think about what truly changed the deviation.");
      }
    }
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // --- Constraint Logic ---
  const checkConstraints = (mAngle: number, iAngle: number, sDist: number) => {
    // Constants must match simulation
    // Using handleRadius from state for consistency
    const fixedIncidentDist = handleRadius * 0.6;
    const incidentPoint = { x: fixedIncidentDist, y: 0 };

    // Source Position
    const sourcePos = {
      x: incidentPoint.x + sDist * Math.cos(degToRad(iAngle)),
      y: incidentPoint.y + sDist * Math.sin(degToRad(iAngle)),
    };

    // Mirror 2 Vector
    // We want Source to be "Right" of Mirror 2 (Clockwise).
    // Mirror 2 is a ray from (0,0) at angle mAngle.
    // CP = Mx * Sy - My * Sx
    const mx = Math.cos(degToRad(mAngle));
    const my = Math.sin(degToRad(mAngle));
    const cp = mx * sourcePos.y - my * sourcePos.x;

    // console.log('checkConstraints:', { mAngle, iAngle, sDist, sourcePos, mx, my, cp });

    const BUFFER = -15;

    // Constraint 1: Right of Mirror 2
    if (cp > BUFFER) return false;

    // Constraint 2: Above Mirror 1 (y >= 0)
    // Mirror 1 is on y=0 line. We want y to be positive (or close enough).
    if (sourcePos.y < 15) return false; // slight buffer for touch inaccuracies

    return true;
  };

  const handleSetMirrorAngle = (val: number) => {
    if (checkConstraints(val, incidentAngle, sourceDist)) {
      setMirrorAngle(val);
    }
  };

  const handleSetIncidentAngle = (val: number) => {
    if (checkConstraints(mirrorAngle, val, sourceDist)) {
      setIncidentAngle(val);
    }
  };

  const handleSetSourceDist = (val: number) => {
    if (checkConstraints(mirrorAngle, incidentAngle, val)) {
      setSourceDist(val);
    }
  };

  const startGame = () => {
    setGameState(prev => ({ ...prev, started: true, challenge: 0, tutorialStep: 0 }));
    setWizardText(WIZARD_TUTORIAL_STEPS[0].message);
    setMirrorAngle(50); // Ensure consistent start state
    setIncidentAngle(60);
  };

  const handleTutorialNext = () => {
    if (gameState.challenge !== 0) return;

    const nextStep = gameState.tutorialStep + 1;
    if (nextStep < WIZARD_TUTORIAL_STEPS.length) {
      setGameState(prev => ({ ...prev, tutorialStep: nextStep }));
      setWizardText(WIZARD_TUTORIAL_STEPS[nextStep].message);
    } else {
      // End of tutorial -> Start Challenge 1
      setGameState(prev => ({ ...prev, challenge: 1 }));
      setWizardText(WIZARD_MESSAGES.c1_start);
    }
  };

  const resetGame = () => {
    setMirrorAngle(130);
    setIncidentAngle(60);
    setGameState({
      started: false,
      challenge: 1,
      tutorialStep: 0,
      jewels: 0,
      points: 0,
      c1Progress: { methodA: false, methodB: false },
    });
    setWizardText(WIZARD_MESSAGES.intro);
    setQuizTriggered(false);
  };

  // --- Dialogue Props Preparation ---
  const dialogueProps = {
    started: gameState.started,
    type: (gameState.challenge === 7 ? 'VICTORY' : (gameState.challenge === 0 ? 'TUTORIAL' : (quizTriggered ? 'QUIZ' : 'INFO'))) as 'INTRO' | 'INFO' | 'QUIZ' | 'VICTORY' | 'TUTORIAL',
    text: (quizTriggered && gameState.challenge !== 1)
      ? (gameState.challenge === 4 ? WIZARD_MESSAGES.c4_quiz : WIZARD_MESSAGES.c5_quiz)
      : wizardText,
    onStart: startGame,
    onNext: handleTutorialNext,
    onQuizAnswer: handleQuizAnswer,
    quizOptions: quizTriggered
      ? (gameState.challenge === 4
        ? [{ label: "No, it stays 180°", value: 0 }, { label: "Yes, it changes", value: 1 }]
        : (gameState.challenge === 1
          ? [{ label: "Find 2nd Way (+10 Pts)", value: 0 }, { label: "Move into Challenge 2", value: 1 }]
          : [{ label: "Light Angle Only", value: 0 }, { label: "Mirror Angle Only", value: 1 }, { label: "Both Angles", value: 2 }]
        )
      )
      : undefined,
    extraContent: (gameState.challenge === 1 || gameState.challenge === 7) ? (
      <>
        {gameState.challenge === 7 && (
          <button onClick={resetGame} className="px-2 py-1 bg-yellow-600 text-white rounded-full font-bold flex items-center gap-1 hover:bg-yellow-500 transition-colors">
            <RotateCcw size={16} /> Play Again
          </button>
        )}
        {gameState.challenge === 1 && (gameState.c1Progress.methodA || gameState.c1Progress.methodB) && (
          <button
            onClick={() => {
              setGameState(prev => ({ ...prev, challenge: 2 }));
              setWizardText(WIZARD_MESSAGES.c2_start);
            }}
            className="px-2 py-1 bg-purple-600/50 text-purple-100 rounded-lg text-xs font-bold hover:bg-purple-600 border border-purple-500 transition-colors flex items-center gap-1"
          >
            Skip to Challenge 2 <ChevronRight size={12} />
          </button>
        )}
      </>
    ) : undefined
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
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full px-3 py-1 flex items-center gap-2">
            <Star className="text-yellow-400 w-4 h-4 fill-yellow-400/20" />
            <span className="font-bold font-mono text-lg">{gameState.points}</span>
          </div>
        </div>
      )}

      {/* --- Unified Dialogue Panel --- */}
      <DialoguePanel
        {...dialogueProps}
        toast={showToast ? (
          <div className="bg-cyan-500 text-slate-900 px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.5)] font-bold text-sm flex items-center gap-2 border border-cyan-400">
            <Gem size={18} className="fill-slate-900" />
            {showToast}
          </div>
        ) : undefined}
      />

      <main className="flex-1 relative bg-slate-950">
        {gameState.started && (
          <OpticalBench
            mirrorAngle={mirrorAngle}
            setMirrorAngle={handleSetMirrorAngle}
            incidentAngle={incidentAngle}
            setIncidentAngle={handleSetIncidentAngle}
            sourceDist={sourceDist}
            setSourceDist={handleSetSourceDist}
            handleRadius={handleRadius}
            setHandleRadius={setHandleRadius}
            mirrorOrigin={mirrorOrigin}
            setMirrorOrigin={setMirrorOrigin}
            highlight={activeHighlight}

            onInteractionEnd={handleInteractionEnd}
          />
        )}
      </main>
      {gameState.started && (
        <ControlPanel
          mirrorAngle={mirrorAngle}
          setMirrorAngle={handleSetMirrorAngle}
          incidentAngle={incidentAngle}
          setIncidentAngle={handleSetIncidentAngle}
          highlight={activeHighlight}

          onInteractionEnd={handleInteractionEnd}
        />
      )}
    </div>
  );
}
