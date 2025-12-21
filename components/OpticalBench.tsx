import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Mirror, Point } from '../types';
import { degToRad, radToDeg, calculateRayPath } from '../utils/geometry';
import { Info } from 'lucide-react';

interface OpticalBenchProps {
  mirrorAngle: number;
  setMirrorAngle: (angle: number) => void;
  incidentAngle: number;
  setIncidentAngle: (angle: number) => void;
}

const OpticalBench: React.FC<OpticalBenchProps> = ({
  mirrorAngle,
  setMirrorAngle,
  incidentAngle,
  setIncidentAngle,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dragTarget, setDragTarget] = useState<'mirror' | 'ray' | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const updateDim = () => {
      if (svgRef.current) {
        const { clientWidth, clientHeight } = svgRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };
    window.addEventListener('resize', updateDim);
    updateDim();
    return () => window.removeEventListener('resize', updateDim);
  }, []);

  // --- Dynamic Layout ---
  // Scale UI elements to fit screen, keeping hinge centered
  const minDim = Math.min(dimensions.width, dimensions.height);
  // Use a sensible default if dimensions are 0 (first render)
  const baseSize = minDim > 0 ? minDim : 300;

  // The handle for rotating Mirror 2 stays at a reasonable distance
  const handleRadius = Math.max(100, baseSize * 0.35);

  // "Infinite" length for the mirrors themselves
  const infiniteLength = 50000;

  const fixedIncidentDist = handleRadius * 0.6;
  const sourceDist = handleRadius * 0.3;

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  const mapToSvg = (p: Point) => ({
    x: centerX + p.x,
    y: centerY - p.y,
  });

  const mapFromSvg = (svgP: Point) => ({
    x: svgP.x - centerX,
    y: centerY - svgP.y,
  });

  // --- Geometry Calculation ---

  // Mirror 1: Fixed Horizontal along +X (Infinite)
  const m1End = { x: infiniteLength, y: 0 };

  // Mirror 2: Rotated by mirrorAngle (Infinite)
  const m2End = {
    x: infiniteLength * Math.cos(degToRad(mirrorAngle)),
    y: infiniteLength * Math.sin(degToRad(mirrorAngle)),
  };

  // Handle Position for Mirror 2 (Visible on screen)
  const m2HandlePos = {
    x: handleRadius * Math.cos(degToRad(mirrorAngle)),
    y: handleRadius * Math.sin(degToRad(mirrorAngle)),
  };

  const mirrors: Mirror[] = [
    { start: { x: 0, y: 0 }, end: m1End, angle: 0, id: 'm1' },
    { start: { x: 0, y: 0 }, end: m2End, angle: mirrorAngle, id: 'm2' },
  ];

  // Fixed Incidence Point on M1
  const incidentPoint = { x: fixedIncidentDist, y: 0 };

  // Source Pos based on incidentAngle
  // incidentAngle is angle of Source pos relative to Incident Point
  const sourcePos = {
    x: incidentPoint.x + sourceDist * Math.cos(degToRad(incidentAngle)),
    y: incidentPoint.y + sourceDist * Math.sin(degToRad(incidentAngle)),
  };

  // Ray tracing starts from Source, pointing towards IncidentPoint
  const rayStart = sourcePos;
  const rayDirVector = {
    x: incidentPoint.x - sourcePos.x,
    y: incidentPoint.y - sourcePos.y
  };
  const rayAngle = radToDeg(Math.atan2(rayDirVector.y, rayDirVector.x));

  const { path, arrows } = useMemo(() =>
    calculateRayPath(rayStart, rayAngle, mirrors),
    [rayStart, rayAngle, mirrors]);


  // --- Interactions ---

  const getSvgPoint = (e: React.PointerEvent | PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d,
    };
  };

  const handlePointerDown = (e: React.PointerEvent, target: 'mirror' | 'ray') => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragTarget(target);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragTarget) return;

    const svgP = getSvgPoint(e);
    const mathP = mapFromSvg(svgP);

    if (dragTarget === 'mirror') {
      // Calculate angle of mathP relative to (0,0)
      let angle = radToDeg(Math.atan2(mathP.y, mathP.x));
      if (angle < 0) angle += 360;
      setMirrorAngle(angle);
    } else if (dragTarget === 'ray') {
      // Calculate angle of mathP relative to incidentPoint
      const dx = mathP.x - incidentPoint.x;
      const dy = mathP.y - incidentPoint.y;
      let angle = radToDeg(Math.atan2(dy, dx));
      if (angle < 0) angle += 360;
      setIncidentAngle(angle);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragTarget(null);
  };

  // --- SVG Coordinates ---
  const svgOrigin = mapToSvg({ x: 0, y: 0 });
  const svgM1End = mapToSvg(m1End);
  const svgM2End = mapToSvg(m2End);
  const svgM2Handle = mapToSvg(m2HandlePos);
  const svgIncidentPoint = mapToSvg(incidentPoint);
  const svgSourcePos = mapToSvg(sourcePos);

  // Angle Arc Path for Mirror Angle
  const arcRadius = handleRadius * 0.25;
  const arcStart = { x: arcRadius, y: 0 };
  const arcEnd = {
    x: arcRadius * Math.cos(degToRad(mirrorAngle)),
    y: arcRadius * Math.sin(degToRad(mirrorAngle))
  };
  const svgArcStart = mapToSvg(arcStart);
  const svgArcEnd = mapToSvg(arcEnd);
  const largeArcFlag = mirrorAngle > 180 ? 1 : 0;

  const anglePath = `M ${svgArcStart.x} ${svgArcStart.y} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 0 ${svgArcEnd.x} ${svgArcEnd.y}`;

  return (
    <div className="w-full h-full bg-slate-950 relative overflow-hidden select-none">

      {/* Reset/Info Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <button
          className="pointer-events-auto bg-slate-800/80 p-2 rounded-full text-cyan-400 border border-cyan-500/30 hover:bg-slate-700 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
          title="Show Instructions"
        >
          <Info size={20} />
        </button>

        {showInfo && (
          <div className="mt-2 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl text-slate-300 text-xs md:text-sm max-w-[200px] shadow-xl animate-in fade-in slide-in-from-top-2">
            <h1 className="font-bold text-white text-lg mb-2">Optics Lab</h1>
            <p className="mb-1">Drag <span className="text-cyan-400 font-bold">blue handle</span> to rotate mirror.</p>
            <p>Drag <span className="text-yellow-400 font-bold">yellow source</span> to move light.</p>
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#facc15" />
          </marker>
        </defs>

        {/* --- Center Crosshair (Subtle) --- */}
        <line x1={centerX - 5} y1={centerY} x2={centerX + 5} y2={centerY} stroke="#334155" />
        <line x1={centerX} y1={centerY - 5} x2={centerX} y2={centerY + 5} stroke="#334155" />

        {/* --- MIRRORS --- */}
        {/* Mirror 1 (Horizontal) */}
        <line
          x1={svgOrigin.x}
          y1={svgOrigin.y}
          x2={svgM1End.x}
          y2={svgM1End.y}
          stroke="#94a3b8"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Mirror 2 (Rotatable) */}
        <g
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePointerDown(e, 'mirror')}
        >
          <line
            x1={svgOrigin.x}
            y1={svgOrigin.y}
            x2={svgM2End.x}
            y2={svgM2End.y}
            stroke="#22d3ee"
            strokeWidth="6"
            strokeLinecap="round"
            className="transition-colors hover:stroke-cyan-300"
          />
          {/* Mirror 2 Handle - Positioned at handleRadius, not at end of infinite mirror */}
          <circle
            cx={svgM2Handle.x}
            cy={svgM2Handle.y}
            r="20"
            fill="rgba(34, 211, 238, 0.1)"
            stroke="#22d3ee"
            strokeWidth="2"
          />
        </g>

        {/* --- HINGE --- */}
        <circle cx={svgOrigin.x} cy={svgOrigin.y} r="6" fill="#475569" />

        {/* --- ANGLE INDICATOR --- */}
        <path d={anglePath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
        <text
          x={svgOrigin.x + (arcRadius + 25) * Math.cos(degToRad(mirrorAngle / 2))}
          y={svgOrigin.y - (arcRadius + 25) * Math.sin(degToRad(mirrorAngle / 2))}
          fill="#94a3b8"
          fontSize="12"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {Math.round(mirrorAngle)}°
        </text>

        {/* --- RAYS --- */}
        <g>
          <polyline
            points={path.map(p => {
              const sp = mapToSvg(p);
              return `${sp.x},${sp.y}`;
            }).join(' ')}
            fill="none"
            stroke="#facc15"
            strokeWidth="2"
            strokeOpacity="0.8"
            style={{ filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.5))' }}
          />

          {arrows.map((arrow, idx) => {
            const sp = mapToSvg(arrow.pos);
            return (
              <polygon
                key={idx}
                points="-4,-3 4,0 -4,3"
                fill="#facc15"
                transform={`translate(${sp.x}, ${sp.y}) rotate(${-arrow.angle})`}
              />
            );
          })}
        </g>

        {/* --- SOURCE & INCIDENT CONTROL --- */}
        <g
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => handlePointerDown(e, 'ray')}
        >
          <line
            x1={svgIncidentPoint.x}
            y1={svgIncidentPoint.y}
            x2={svgSourcePos.x}
            y2={svgSourcePos.y}
            stroke="#facc15"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          <circle
            cx={svgSourcePos.x}
            cy={svgSourcePos.y}
            r="16"
            fill="#facc15"
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={svgSourcePos.x}
            y={svgSourcePos.y - 24}
            fill="#facc15"
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
          >
            L
          </text>
        </g>

        <circle cx={svgIncidentPoint.x} cy={svgIncidentPoint.y} r="4" fill="#facc15" />

      </svg>
    </div>
  );
};

export default OpticalBench;