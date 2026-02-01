import React, { useState } from 'react';
import { Settings2, Sun, X } from 'lucide-react';
import { HighlightTarget } from '../types';

interface ControlPanelProps {
  mirrorAngle: number;
  setMirrorAngle: (val: number) => void;
  incidentAngle: number;
  setIncidentAngle: (val: number) => void;
  highlight: HighlightTarget | null;
  onInteractionEnd: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mirrorAngle,
  setMirrorAngle,
  incidentAngle,
  setIncidentAngle,
  highlight,
  onInteractionEnd
}) => {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const mirrorBtnRef = React.useRef<HTMLButtonElement>(null);
  const sourceBtnRef = React.useRef<HTMLButtonElement>(null);

  const [activeControl, setActiveControl] = useState<'mirror' | 'source' | null>(null);

  const toggleControl = (control: 'mirror' | 'source') => {
    setActiveControl(prev => prev === control ? null : control);
  };

  const handleBlur = (e: React.FocusEvent) => {
    const nextFocus = e.relatedTarget as Node | null;
    // Do not close if moving focus within the popover or to one of the control buttons
    if (popoverRef.current?.contains(nextFocus) ||
      mirrorBtnRef.current?.contains(nextFocus) ||
      sourceBtnRef.current?.contains(nextFocus)) {
      return;
    }
    setActiveControl(null);
  };

  return (
    <>
      <div className="fixed top-4 left-16 z-40 flex gap-2">

        {/* Mirror Control Button */}
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

        {/* Source Control Button */}
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

      </div>

      {/* Floating Popover Controls */}
      {activeControl && (
        <div
          ref={popoverRef}
          tabIndex={-1} // Allow container to receive focus if needed, but mainly for contains checks
          onBlur={handleBlur} // Handle blur when focus leaves the popover itself (e.g. from inputs)
          className="fixed top-16 z-40 animate-in fade-in slide-in-from-top-2 duration-200 focus:outline-none origin-top-left"
          style={{ left: activeControl === 'mirror' ? '4rem' : '7rem' }}
        >
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl shadow-2xl w-80 relative">

            {activeControl === 'mirror' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-cyan-400 font-bold flex items-center gap-2">
                    <Settings2 size={18} /> Mirror Angle
                  </h3>
                  <span className="font-mono text-xl font-bold text-white">{Math.round(mirrorAngle)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={mirrorAngle}
                  onChange={(e) => setMirrorAngle(Number(e.target.value))}
                  onMouseUp={onInteractionEnd}
                  onTouchEnd={onInteractionEnd}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <div className="flex justify-between items-center text-xs text-slate-500 font-mono mt-2">
                  <span>0°</span>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={Math.round(mirrorAngle)}
                    onChange={(e) => setMirrorAngle(Number(e.target.value))}
                    onBlur={(e) => {
                      onInteractionEnd();
                      handleBlur(e); // Ensure specific inputs also notify focus strategy if needed
                    }}
                    className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                  />
                  <span>360°</span>
                </div>
              </div>
            )}

            {activeControl === 'source' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-yellow-400 font-bold flex items-center gap-2">
                    <Sun size={18} /> Source Light Angle
                  </h3>
                  <span className="font-mono text-xl font-bold text-white">{Math.round(incidentAngle)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={incidentAngle}
                  onChange={(e) => setIncidentAngle(Number(e.target.value))}
                  onMouseUp={onInteractionEnd}
                  onTouchEnd={onInteractionEnd}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                />
                <div className="flex justify-between items-center text-xs text-slate-500 font-mono mt-2">
                  <span>0°</span>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={Math.round(incidentAngle)}
                    onChange={(e) => setIncidentAngle(Number(e.target.value))}
                    onBlur={(e) => {
                      onInteractionEnd();
                      handleBlur(e);
                    }}
                    className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center font-mono text-yellow-400 focus:outline-none focus:border-yellow-500"
                  />
                  <span>360°</span>
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
