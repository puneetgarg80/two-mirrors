import { Point, Vector, Mirror } from '../types';

export const degToRad = (deg: number) => (deg * Math.PI) / 180;
export const radToDeg = (rad: number) => (rad * 180) / Math.PI;

export const normalize = (v: Vector): Vector => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};

export const rotatePoint = (p: Point, center: Point, angleDeg: number): Point => {
  const rad = degToRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  };
};

// Intersection of Ray (origin + t*dir) and Segment (p1 to p2)
// Returns distance t if intersection exists and t > epsilon, else null
export const intersectRaySegment = (
  rayOrigin: Point,
  rayDir: Vector,
  p1: Point,
  p2: Point
): { point: Point; t: number; normal: Vector } | null => {
  const v1 = rayOrigin.x - p1.x;
  const v2 = rayOrigin.y - p1.y;
  const v3 = p2.x - p1.x;
  const v4 = p2.y - p1.y;
  const v5 = rayDir.x;
  const v6 = rayDir.y;

  const det = v5 * v4 - v6 * v3;
  if (Math.abs(det) < 1e-6) return null; // Parallel

  const t1 = (v3 * v2 - v4 * v1) / det; // Ray parameter
  const t2 = (v5 * v2 - v6 * v1) / det; // Segment parameter

  // t1 > epsilon to avoid self-intersection immediately
  if (t1 > 0.001 && t2 >= 0 && t2 <= 1) {
    const point = {
      x: rayOrigin.x + rayDir.x * t1,
      y: rayOrigin.y + rayDir.y * t1,
    };
    
    // Normal calculation: (-dy, dx) normalized
    let nx = -v4;
    let ny = v3;
    const len = Math.sqrt(nx * nx + ny * ny);
    nx /= len;
    ny /= len;

    // Ensure normal points against the ray direction
    if (nx * rayDir.x + ny * rayDir.y > 0) {
      nx = -nx;
      ny = -ny;
    }

    return { point, t: t1, normal: { x: nx, y: ny } };
  }
  
  return null;
};

export const reflectVector = (v: Vector, n: Vector): Vector => {
  const dot = v.x * n.x + v.y * n.y;
  return {
    x: v.x - 2 * dot * n.x,
    y: v.y - 2 * dot * n.y,
  };
};

export const calculateRayPath = (
  startPoint: Point,
  startAngleDeg: number,
  mirrors: Mirror[],
  maxBounces: number = 20
) => {
  const path: Point[] = [startPoint];
  const arrows: { pos: Point; angle: number }[] = [];
  
  let currentOrigin = startPoint;
  let currentDir = {
    x: Math.cos(degToRad(startAngleDeg)),
    y: Math.sin(degToRad(startAngleDeg)),
  };

  // Add initial arrow
  arrows.push({
      pos: {
          x: currentOrigin.x + currentDir.x * 30,
          y: currentOrigin.y + currentDir.y * 30
      },
      angle: startAngleDeg
  });

  for (let i = 0; i < maxBounces; i++) {
    let closestIntersection: { point: Point; t: number; normal: Vector; mirrorId: string } | null = null;
    let minT = Infinity;

    for (const mirror of mirrors) {
      const hit = intersectRaySegment(currentOrigin, currentDir, mirror.start, mirror.end);
      if (hit && hit.t < minT) {
        minT = hit.t;
        closestIntersection = { ...hit, mirrorId: mirror.id };
      }
    }

    if (closestIntersection) {
      path.push(closestIntersection.point);
      
      // Reflect
      currentDir = reflectVector(currentDir, closestIntersection.normal);
      currentOrigin = closestIntersection.point;
      
      const angle = radToDeg(Math.atan2(currentDir.y, currentDir.x));
      
      // Add arrow for reflection, slightly offset from the bounce point
      arrows.push({
          pos: {
              x: currentOrigin.x + currentDir.x * 40,
              y: currentOrigin.y + currentDir.y * 40
          },
          angle: angle
      });

    } else {
      // Ray goes to infinity (or screen bounds), add a far point for visualization
      path.push({
        x: currentOrigin.x + currentDir.x * 2000,
        y: currentOrigin.y + currentDir.y * 2000,
      });
      break;
    }
  }

  return { path, arrows };
};
