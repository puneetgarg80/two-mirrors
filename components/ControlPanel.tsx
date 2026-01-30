import React, { useState } from 'react';
import { Settings2, Sun, X } from 'lucide-react';
import { HighlightTarget } from '../types';

interface ControlPanelProps {
  mirrorAngle: number;
  setMirrorAngle: (val: number) => void;
  incidentAngle: number;
  setIncidentAngle: (val: number) => void;
  highlight: HighlightTarget | null;
  showVirtualSources: boolean;
  setShowVirtualSources: (val: boolean) => void;
  onInteractionEnd: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mirrorAngle,
  setMirrorAngle,
  incidentAngle,
  setIncidentAngle,
  highlight,
  showVirtualSources,
  setShowVirtualSources,
  onInteractionEnd
}) => {
  const [activeControl, setActiveControl] = useState<'mirror' | 'source' | null>(null);

  const toggleControl = (control: 'mirror' | 'source') => {
    setActiveControl(prev => prev === control ? null : control);
  };

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex gap-4">

        {/* Mirror Control Button */}
        <button
          onClick={() => toggleControl('mirror')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 font-medium ${activeControl === 'mirror'
            ? 'bg-cyan-900/80 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
            : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            } ${highlight === 'mirrorButton' ? 'animate-bounce ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900' : ''}`}
        >
          <Settings2 size={18} />
          <span>Mirror</span>
        </button>

        {/* Source Control Button */}
        <button
          onClick={() => toggleControl('source')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 font-medium ${activeControl === 'source'
            ? 'bg-yellow-900/80 border-yellow-500 text-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
            : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            } ${highlight === 'sourceButton' || highlight === 'mirrorButton' ? 'animate-bounce delay-100 ring-2 ring-yellow-500 ring-offset-2 ring-offset-slate-900' : ''}`}
        >
          <Sun size={18} />
          <span>Source</span>
        </button>

        {/* Virtual Source Toggle */}
        <button
          onClick={() => setShowVirtualSources(!showVirtualSources)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 font-medium ${showVirtualSources
            ? 'bg-purple-900/80 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
            : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            } ${highlight === 'virtualSourcesToggle' ? 'animate-bounce delay-200 ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900' : ''}`}
        >
          <span>Virtual Sources</span>
        </button>

      </div>

      {/* Floating Popover Controls */}
      {activeControl && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl shadow-2xl w-80 relative">

            <button
              onClick={() => setActiveControl(null)}
              className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white rounded-full hover:bg-slate-800"
            >
              <X size={16} />
            </button>

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
                    onBlur={onInteractionEnd}
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
                    <Sun size={18} /> Source Angle
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
                    onBlur={onInteractionEnd}
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
