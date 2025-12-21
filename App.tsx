import React, { useState, useEffect } from 'react';
import OpticalBench from './components/OpticalBench';
import ControlPanel from './components/ControlPanel';
import { SimulationState } from './types';

export default function App() {
  // Initial Requirement:
  // "Initially place L at angle bisector of two mirrors. Ray from L at angle 1/3 of angle between mirrors."
  // Mirror Angle: Let's pick 60 degrees.
  // Bisector: 30 degrees.
  // Ray Angle: "1/3 of angle between mirrors". 60/3 = 20 degrees.
  // This 20 degrees is likely relative to one mirror.
  // If L is on the bisector (30 deg), and it shoots a ray at 20 deg (relative to Mirror 1),
  // The source position must be calculated such that the vector S -> P is at 20 degrees?
  // Or is the ray angle 20 degrees relative to the bisector?
  // Let's interpret: "Ray from L forms an angle of (MirrorAngle/3) with Mirror 1".
  
  const INITIAL_MIRROR_ANGLE = 60;
  const INITIAL_INCIDENT_ANGLE = INITIAL_MIRROR_ANGLE / 3; // 20 degrees relative to M1

  const [mirrorAngle, setMirrorAngle] = useState(INITIAL_MIRROR_ANGLE);
  
  // We store incidentAngle as the angle of the SOURCE relative to the fixed point.
  // If the ray hits M1 at angle 20 deg, the source is at 20 deg relative to M1.
  const [incidentAngle, setIncidentAngle] = useState(INITIAL_INCIDENT_ANGLE);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
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
