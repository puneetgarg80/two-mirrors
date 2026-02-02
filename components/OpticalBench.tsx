import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Mirror, Point, HighlightTarget } from '../types';
import { degToRad, radToDeg, calculateRayPath } from '../utils/geometry';

interface OpticalBenchProps {
  mirrorAngle: number;
  setMirrorAngle: (angle: number) => void;
  incidentAngle: number;
  setIncidentAngle: (angle: number) => void;
  sourceDist: number;
  setSourceDist: (dist: number) => void;
  handleRadius: number;
  setHandleRadius: (radius: number) => void;
  mirrorOrigin: { x: number; y: number } | null;
  setMirrorOrigin: (origin: { x: number; y: number } | null) => void;
  highlight: HighlightTarget | null;
  onInteractionEnd: () => void;
}

const OpticalBench: React.FC<OpticalBenchProps> = ({
  mirrorAngle,
  setMirrorAngle,
  incidentAngle,
  setIncidentAngle,
  sourceDist,
  setSourceDist,
  handleRadius,
  setHandleRadius,
  mirrorOrigin,
  setMirrorOrigin,
  highlight,
  onInteractionEnd
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  const [dragTarget, setDragTarget] = useState<'mirror' | 'ray' | 'origin' | null>(null);


  useEffect(() => {
    const updateDim = () => {
      // Since the component is fixed inset-0, use window dimensions
      if (typeof window !== 'undefined') {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }
    };
    window.addEventListener('resize', updateDim);
    updateDim();
    return () => window.removeEventListener('resize', updateDim);
  }, []);

  // --- Dynamic Layout ---
  // Scale UI elements to fit screen, keeping hinge centered
  useEffect(() => {
    const minDim = Math.min(dimensions.width, dimensions.height);
    // Use a sensible default if dimensions are 0 (first render)
    const baseSize = minDim > 0 ? minDim : 300;

    // The handle for rotating Mirror 2 stays at a reasonable distance
    const newRadius = Math.max(100, baseSize * 0.35);
    setHandleRadius(newRadius);
  }, [dimensions, setHandleRadius]);

  // Use the prop handle radius logic for local calculations
  // const handleRadius = ... (removed local calculation)

  // "Infinite" length for the mirrors themselves
  const infiniteLength = 50000;

  const fixedIncidentDist = handleRadius * 0.6;
  // Use state for source distance
  // const sourceDist = handleRadius * 0.3; // Replaced by state

  const centerX = mirrorOrigin ? mirrorOrigin.x : 200;
  const centerY = mirrorOrigin ? mirrorOrigin.y : dimensions.height - 350;

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

  const { path, arrows, reflections, totalDeviation } = useMemo(() =>
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

  const handlePointerDown = (e: React.PointerEvent, target: 'mirror' | 'ray' | 'origin') => {
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
      // Snap to nearest integer
      setMirrorAngle(Math.round(angle));
    } else if (dragTarget === 'ray') {
      // Calculate angle of mathP relative to incidentPoint
      const dx = mathP.x - incidentPoint.x;
      const dy = mathP.y - incidentPoint.y;

      const newDist = Math.sqrt(dx * dx + dy * dy);
      // Clamp distance to reasonable limits (e.g. 20 to 500)
      const clampedDist = Math.max(20, Math.min(newDist, 1000));
      setSourceDist(clampedDist);



      let angle = radToDeg(Math.atan2(dy, dx));
      if (angle < 0) angle += 360;
      setIncidentAngle(Math.round(angle));
    } else if (dragTarget === 'origin') {
      // dragging the vertex itself.
      // svgP is the cursor position in SVG coordinates.
      // We want the new origin to be exactly where the cursor is.
      // Note: mapToSvg uses centerX/centerY. We need to be careful not to create a loop if we depend on them.
      // However, we are setting the STATE which drives the render.
      // The coordinates from getSvgPoint are relative to the viewport (because of CTM).

      // getSvgPoint returns coordinates in the USER SPACE of the SVG.
      // If viewBox is not set (which it isn't), user space ~= viewport space = pixels.

      setMirrorOrigin({ x: svgP.x, y: svgP.y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragTarget(null);
    onInteractionEnd();
  };

  // --- SVG Coordinates ---
  const svgOrigin = mapToSvg({ x: 0, y: 0 });
  const svgM1End = mapToSvg(m1End);
  const svgM2End = mapToSvg(m2End);
  const svgM2Handle = mapToSvg(m2HandlePos);
  const svgIncidentPoint = mapToSvg(incidentPoint);
  const svgSourcePos = mapToSvg(sourcePos);

  // Angle Arc Path for Mirror Angle
  const arcRadius = handleRadius * 0.15;
  const arcStart = { x: arcRadius, y: 0 };
  const arcEnd = {
    x: arcRadius * Math.cos(degToRad(mirrorAngle)),
    y: arcRadius * Math.sin(degToRad(mirrorAngle))
  };
  const svgArcStart = mapToSvg(arcStart);
  const svgArcEnd = mapToSvg(arcEnd);
  const largeArcFlag = mirrorAngle > 180 ? 1 : 0;

  const anglePath = `M ${svgArcStart.x} ${svgArcStart.y} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 0 ${svgArcEnd.x} ${svgArcEnd.y}`;

  // Helper to render hatches (shaded side of mirror)
  const renderHatches = (mAngle: number, type: 'm1' | 'm2') => {
    const hatchSpacing = 12;
    const hatchLen = 8;
    // Calculate visible length based on screen size
    const maxLen = Math.max(dimensions.width, dimensions.height, 1000) * 1.5;

    // M1 (0 deg): Back is -90. Slant -135 (points down-left).
    // M2 (angle): Back is angle+90. Slant angle+45 (points "up-left" relative to mirror vector).
    const hatchDir = type === 'm1' ? -135 : mAngle + 45;

    const elements = [];
    for (let d = hatchSpacing; d < maxLen; d += hatchSpacing) {
      const mx = d * Math.cos(degToRad(mAngle));
      const my = d * Math.sin(degToRad(mAngle));

      const px = mx + hatchLen * Math.cos(degToRad(hatchDir));
      const py = my + hatchLen * Math.sin(degToRad(hatchDir));

      const p1 = mapToSvg({ x: mx, y: my });
      const p2 = mapToSvg({ x: px, y: py });

      elements.push(
        <line
          key={d}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke="#475569"
          strokeWidth="1.5"
        />
      );
    }
    return <g className="pointer-events-none">{elements}</g>;
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">

      {/* Persistent Deviation Display */}
      <div className="absolute top-20 right-4 z-0 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-xl shadow-xl">
          <span className="text-slate-400 text-sm mr-2">Deviation:</span>
          <span className="font-mono text-cyan-400 font-bold text-lg">{Math.round(totalDeviation)}°</span>
          <br />
          <span className="text-slate-400 text-sm mr-2">Reflections:</span>
          <span className="font-mono text-cyan-400 font-bold text-lg">{reflections.length}</span>
        </div>
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

        {/* --- MIRROR HATCHES --- */}
        {renderHatches(0, 'm1')}
        {renderHatches(mirrorAngle, 'm2')}

        {/* --- MIRRORS --- */}
        {/* Mirror 1 (Horizontal) */}
        <line
          x1={svgOrigin.x}
          y1={svgOrigin.y}
          x2={svgM1End.x}
          y2={svgM1End.y}
          stroke={highlight === 'mirrors' ? "#34d399" : "#94a3b8"}
          strokeWidth="6"
          strokeLinecap="round"
          className={highlight === 'mirrors' ? "animate-pulse" : ""}
          style={{ filter: highlight === 'mirrors' ? "drop-shadow(0 0 8px #34d399)" : "" }}
        />
        {/* Mirror 2 (Rotatable) */}
        <g
          className="cursor-grab active:cursor-grabbing pointer-events-auto"
          onPointerDown={(e) => handlePointerDown(e, 'mirror')}
        >
          <line
            x1={svgOrigin.x}
            y1={svgOrigin.y}
            x2={svgM2End.x}
            y2={svgM2End.y}
            stroke={highlight === 'mirrors' ? "#34d399" : "#22d3ee"}
            strokeWidth="6"
            strokeLinecap="round"
            className={`transition-colors hover:stroke-cyan-300 ${highlight === 'mirrors' ? "animate-pulse" : ""}`}
            style={{ filter: highlight === 'mirrors' ? "drop-shadow(0 0 8px #34d399)" : "" }}
          />

          {/* Highlight for Mirror Control Handle */}
          {highlight === 'mirrorControl' && (
            <circle
              cx={svgM2Handle.x}
              cy={svgM2Handle.y}
              r="30"
              fill="rgba(34, 211, 238, 0.2)"
              stroke="#22d3ee"
              strokeWidth="2"
              className="animate-ping opacity-75"
            />
          )}

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
        <g
          className="cursor-move active:cursor-grabbing pointer-events-auto"
          onPointerDown={(e) => handlePointerDown(e, 'origin')}
        >
          <circle cx={svgOrigin.x} cy={svgOrigin.y} r="12" fill="transparent" /> {/* Hit area */}
          <circle cx={svgOrigin.x} cy={svgOrigin.y} r="6" fill="#475569" className="hover:fill-cyan-400 transition-colors" />
        </g>

        {/* --- ANGLE INDICATOR --- */}
        <path d={anglePath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
        <text
          x={svgOrigin.x + (arcRadius + 15) * Math.cos(degToRad(mirrorAngle / 2))}
          y={svgOrigin.y - (arcRadius + 15) * Math.sin(degToRad(mirrorAngle / 2))}
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

        {/* --- REFLECTION ANGLES --- */}
        <g>
          {reflections.map((ref, idx) => {
            // Incoming ray angle (pointing backwards from the reflection point)
            const prevPt = path[idx];
            const currentPt = path[idx + 1];
            const dx = prevPt.x - currentPt.x;
            const dy = prevPt.y - currentPt.y;
            const sourceAngle = radToDeg(Math.atan2(dy, dx));

            // Arc for Angle of Incidence
            const arcR = 30; // Radius for the arc
            const arcStart = {
              x: ref.point.x + arcR * Math.cos(degToRad(ref.normalAngle)),
              y: ref.point.y + arcR * Math.sin(degToRad(ref.normalAngle))
            };
            const arcEnd = {
              x: ref.point.x + arcR * Math.cos(degToRad(sourceAngle)),
              y: ref.point.y + arcR * Math.sin(degToRad(sourceAngle))
            };

            const svgArcStart = mapToSvg(arcStart);
            const svgArcEnd = mapToSvg(arcEnd);

            // Determine sweep-flag: cross product of normal and incoming vector
            // normalize normal vector n = (nx, ny)
            // normalize incoming vector v = (dx, dy)
            // cp = nx * dy - ny * dx
            const nx = Math.cos(degToRad(ref.normalAngle));
            const ny = Math.sin(degToRad(ref.normalAngle));
            const cp = nx * dy - ny * dx;
            const sweepFlag = cp > 0 ? 0 : 1;

            const arcPath = `M ${svgArcStart.x} ${svgArcStart.y} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${svgArcEnd.x} ${svgArcEnd.y}`;

            // Offset text along the angle between normal and source
            const midAngle = cp > 0 ? ref.normalAngle + ref.incidentAngle / 2 : ref.normalAngle - ref.incidentAngle / 2;
            const textDist = arcR + 12; // Adjusted distance to place text closer to the arc
            const svgTextPos = mapToSvg({
              x: ref.point.x + textDist * Math.cos(degToRad(midAngle)),
              y: ref.point.y + textDist * Math.sin(degToRad(midAngle))
            });
            const sp = mapToSvg(ref.point);

            // Calculate normal end point in math space
            const normalLen = 40;
            const normalEndMath = {
              x: ref.point.x + normalLen * Math.cos(degToRad(ref.normalAngle)),
              y: ref.point.y + normalLen * Math.sin(degToRad(ref.normalAngle))
            };
            const spEnd = mapToSvg(normalEndMath);

            return (
              <g key={idx}>
                {/* Normal Vector */}
                <line
                  x1={sp.x}
                  y1={sp.y}
                  x2={spEnd.x}
                  y2={spEnd.y}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                {/* Arc path */}
                <path
                  d={arcPath}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.8"
                />
                <text
                  x={svgTextPos.x}
                  y={svgTextPos.y}
                  fill="#ffffff"
                  fontSize="10"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  style={{ textShadow: '0px 0px 3px #000' }}
                >
                  {Math.round(ref.incidentAngle)}°
                </text>
              </g>
            );
          })}
        </g>


        {/* --- SOURCE & INCIDENT CONTROL --- */}
        <g
          className="cursor-grab active:cursor-grabbing pointer-events-auto"
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
            className={highlight === 'sourceControl' ? "animate-pulse stroke-2" : ""}
          />

          {(highlight === 'source' || highlight === 'sourceControl') && (
            <circle
              cx={svgSourcePos.x}
              cy={svgSourcePos.y}
              r="30"
              fill="rgba(250, 204, 21, 0.2)"
              stroke="#facc15"
              strokeWidth="2"
              className="animate-ping opacity-75"
            />
          )}

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

        {/* --- LABELS --- */}
        <g className="pointer-events-none select-none font-sans font-bold text-xs" style={{ textShadow: '0px 0px 4px #000' }}>
          {/* Origin O */}
          <text x={svgOrigin.x - 15} y={svgOrigin.y + 20} fill="#94a3b8">O</text>

          {/* Mirror 1 Label */}
          <text x={svgOrigin.x + 50} y={svgOrigin.y + 20} fill="#94a3b8">M1</text>

          {/* Mirror 2 Label */}
          <text
            x={svgOrigin.x + 50 * Math.cos(degToRad(mirrorAngle)) - 20 * Math.sin(degToRad(mirrorAngle))}
            y={svgOrigin.y - 50 * Math.sin(degToRad(mirrorAngle)) - 20 * Math.cos(degToRad(mirrorAngle))}
            fill="#22d3ee"
          >
            M2
          </text>

          {/* Reflection Points */}
          {reflections.map((ref, i) => {
            const sp = mapToSvg(ref.point);
            return (
              <text key={i} x={sp.x + 10} y={sp.y - 10} fill="#facc15">
                R{i + 1}
              </text>
            );
          })}
        </g>

      </svg>
    </div>
  );
};

export default OpticalBench;