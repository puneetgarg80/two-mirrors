import React from 'react';

interface ControlPanelProps {
  mirrorAngle: number;
  setMirrorAngle: (val: number) => void;
  incidentAngle: number;
  setIncidentAngle: (val: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mirrorAngle,
  setMirrorAngle,
  incidentAngle,
  setIncidentAngle,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-700 p-6 flex flex-col md:flex-row gap-6 md:gap-12 z-20 pb-8 md:pb-6">
      
      {/* Mirror Angle Control */}
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="mirror-angle" className="text-sm font-medium text-slate-300">
            Mirror Angle
          </label>
          <div className="flex items-center gap-2">
             <input
              type="number"
              min="0"
              max="360"
              value={Math.round(mirrorAngle)}
              onChange={(e) => setMirrorAngle(Number(e.target.value))}
              className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right font-mono text-cyan-400 focus:outline-none focus:border-cyan-500 text-sm"
            />
            <span className="text-cyan-400 font-mono font-bold">°</span>
          </div>
        </div>
        <input
          id="mirror-angle"
          type="range"
          min="0"
          max="360"
          step="1"
          value={mirrorAngle}
          onChange={(e) => setMirrorAngle(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>0°</span>
          <span>180°</span>
          <span>360°</span>
        </div>
      </div>

      {/* Incident Angle Control */}
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="incident-angle" className="text-sm font-medium text-slate-300">
            Incident Source Angle
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="360"
              value={Math.round(incidentAngle)}
              onChange={(e) => setIncidentAngle(Number(e.target.value))}
              className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-right font-mono text-yellow-400 focus:outline-none focus:border-yellow-500 text-sm"
            />
            <span className="text-yellow-400 font-mono font-bold">°</span>
          </div>
        </div>
        <input
          id="incident-angle"
          type="range"
          min="0"
          max="360"
          step="1"
          value={incidentAngle}
          onChange={(e) => setIncidentAngle(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>0°</span>
          <span>180°</span>
          <span>360°</span>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
