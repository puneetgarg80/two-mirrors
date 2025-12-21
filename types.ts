export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Ray {
  origin: Point;
  direction: Vector;
  angle: number; // in degrees, standard math notation (0 is right, CCW positive)
}

export interface Mirror {
  start: Point;
  end: Point;
  angle: number; // degrees
  id: string;
}

export interface SimulationState {
  mirrorAngle: number; // Angle between mirrors in degrees
  incidentAngle: number; // Angle of incident ray relative to Mirror 1 (Horizontal)
}