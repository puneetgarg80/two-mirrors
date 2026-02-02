import React, { useState } from 'react';
import { Settings2, Sun, X, Plus, Minus, Info, Lightbulb } from 'lucide-react';
import { HighlightTarget } from '../types';

interface ControlPanelProps {
  mirrorAngle: number;
  setMirrorAngle: (val: number) => void;
  incidentAngle: number;
  setIncidentAngle: (val: number) => void;
  highlight: HighlightTarget | null;
  hintText?: string;
  onInteractionEnd: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mirrorAngle,
  setMirrorAngle,
  incidentAngle,
  setIncidentAngle,
  highlight,
  hintText,
  onInteractionEnd
}) => {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const mirrorBtnRef = React.useRef<HTMLButtonElement>(null);
  const sourceBtnRef = React.useRef<HTMLButtonElement>(null);
  const infoBtnRef = React.useRef<HTMLButtonElement>(null);
  const hintBtnRef = React.useRef<HTMLButtonElement>(null);

  const [activeControl, setActiveControl] = useState<'info' | 'mirror' | 'source' | 'hint' | null>(null);

  // Auto-show hint when it changes (new challenge)
  React.useEffect(() => {
    if (hintText) {
      setActiveControl('hint');
    }
  }, [hintText]);

  // Focus popover when it opens to enable blur dismissal
  React.useEffect(() => {
    if (activeControl && popoverRef.current) {
      popoverRef.current.focus({ preventScroll: true });
    }
  }, [activeControl]);

  const toggleControl = (control: 'info' | 'mirror' | 'source' | 'hint') => {
    setActiveControl(prev => prev === control ? null : control);
  };

  const handleBlur = (e: React.FocusEvent) => {
    const nextFocus = e.relatedTarget as Node | null;
    // Do not close if moving focus within the popover or to one of the control buttons
    if (popoverRef.current?.contains(nextFocus) ||
      mirrorBtnRef.current?.contains(nextFocus) ||
      sourceBtnRef.current?.contains(nextFocus) ||
      infoBtnRef.current?.contains(nextFocus) ||
      hintBtnRef.current?.contains(nextFocus)) {
      return;
    }
    setActiveControl(null);
  };

  const adjustAngle = (
    type: 'mirror' | 'source',
    delta: number,
    currentVal: number,
    setVal: (v: number) => void
  ) => {
    let newVal = Math.round(currentVal + delta);
    if (newVal < 0) newVal += 360;
    if (newVal >= 360) newVal -= 360;
    setVal(newVal);
    onInteractionEnd();
  };

  return (
    <>
      <div className="fixed top-4 left-4 z-[60] flex gap-2">

        {/* Info Button - FIRST */}
        <button
          ref={infoBtnRef}
          onClick={() => toggleControl('info')}
          onBlur={handleBlur}
          title="Show Info"
          className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${activeControl === 'info'
            ? 'bg-slate-800 text-white border-slate-600 shadow-xl'
            : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
        >
          <Info size={18} />
        </button>

        {/* Divider */}
        <div className="w-px bg-slate-700 mx-1 h-9" />

        {/* Mirror Control Button - SECOND */}
        <button
          ref={mirrorBtnRef}
          onClick={() => toggleControl('mirror')}
          onBlur={handleBlur}
          title="Mirror Settings"
          className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${activeControl === 'mirror'
            ? 'bg-cyan-900/80 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
            : 'bg-slate-900/80 border-slate-700 text-cyan-400 border-cyan-500/30 hover:bg-slate-800'
            } ${highlight === 'mirrorButton' ? 'animate-bounce ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900' : ''}`}
        >
          <Settings2 size={18} />
        </button>

        {/* Source Control Button - THIRD */}
        <button
          ref={sourceBtnRef}
          onClick={() => toggleControl('source')}
          onBlur={handleBlur}
          title="Source Settings"
          className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${activeControl === 'source'
            ? 'bg-yellow-900/80 border-yellow-500 text-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
            : 'bg-slate-900/80 border-slate-700 text-yellow-400 border-yellow-500/30 hover:bg-slate-800'
            } ${highlight === 'sourceButton' || highlight === 'mirrorButton' ? 'animate-bounce delay-100 ring-2 ring-yellow-500 ring-offset-2 ring-offset-slate-900' : ''}`}
        >
          <Sun size={18} />
        </button>

        {/* Hint Button - FOURTH */}
        {hintText && (
          <button
            ref={hintBtnRef}
            onClick={() => toggleControl('hint')}
            onBlur={handleBlur}
            title="Show Hint"
            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${activeControl === 'hint'
              ? 'bg-yellow-900/40 border-yellow-500/50 text-yellow-200 shadow-xl'
              : 'bg-slate-900/80 border-slate-700 text-yellow-500 hover:text-yellow-400 hover:bg-slate-800'
              }`}
          >
            <Lightbulb size={18} className={activeControl === 'hint' ? "fill-current" : ""} />
          </button>
        )}

      </div>

      {/* Floating Popover Controls */}
      {activeControl && (
        <div
          ref={popoverRef}
          tabIndex={-1}
          onBlur={handleBlur}
          className="fixed top-16 z-[60] animate-in fade-in slide-in-from-top-2 duration-200 focus:outline-none origin-top-left"
          style={{
            left: activeControl === 'info' ? '1rem' :
              activeControl === 'mirror' ? '4rem' :
                activeControl === 'source' ? '7rem' : '10rem'
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-3 rounded-xl shadow-2xl min-w-[200px] relative">

            {/* INFO POPOVER */}
            {activeControl === 'info' && (
              <div className="flex flex-col gap-2">
                <h3 className="text-cyan-400 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider mb-1">
                  <Info size={14} /> About
                </h3>
                <div className="text-slate-300 text-xs leading-relaxed space-y-2">
                  <p>Explore reflection with two mirrors.</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    <li>Drag <span className="text-yellow-400 font-bold">Sun</span> to move light.</li>
                    <li>Drag <span className="text-cyan-400 font-bold">Blue Dot</span> to rotate mirror.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* MIRROR POPOVER */}
            {activeControl === 'mirror' && (
              <div className="flex flex-col gap-1 w-[180px]">
                <h3 className="text-cyan-400 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Settings2 size={12} /> Mirror Angle
                </h3>
                <div className="flex items-center justify-between gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
                  <button onClick={() => adjustAngle('mirror', -1, mirrorAngle, setMirrorAngle)} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Minus size={16} /></button>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="360" value={Math.round(mirrorAngle)} onChange={(e) => setMirrorAngle(Number(e.target.value))} onBlur={(e) => { onInteractionEnd(); handleBlur(e); }} className="w-12 bg-transparent text-center font-mono text-lg font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="text-slate-500 text-sm">°</span>
                  </div>
                  <button onClick={() => adjustAngle('mirror', 1, mirrorAngle, setMirrorAngle)} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Plus size={16} /></button>
                </div>
              </div>
            )}

            {/* SOURCE POPOVER */}
            {activeControl === 'source' && (
              <div className="flex flex-col gap-1 w-[180px]">
                <h3 className="text-yellow-400 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Sun size={12} /> Light Angle
                </h3>
                <div className="flex items-center justify-between gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
                  <button onClick={() => adjustAngle('source', -1, incidentAngle, setIncidentAngle)} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Minus size={16} /></button>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="360" value={Math.round(incidentAngle)} onChange={(e) => setIncidentAngle(Number(e.target.value))} onBlur={(e) => { onInteractionEnd(); handleBlur(e); }} className="w-12 bg-transparent text-center font-mono text-lg font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="text-slate-500 text-sm">°</span>
                  </div>
                  <button onClick={() => adjustAngle('source', 1, incidentAngle, setIncidentAngle)} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Plus size={16} /></button>
                </div>
              </div>
            )}

            {/* HINT POPOVER */}
            {activeControl === 'hint' && hintText && (
              <div className="flex flex-col gap-2 max-w-[250px]">
                <h3 className="text-yellow-400 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider mb-1">
                  <Lightbulb size={14} className="fill-current" /> Hint
                </h3>
                <div className="text-slate-200 text-sm font-medium leading-relaxed">
                  {hintText}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default ControlPanel;
