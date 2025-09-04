/**
 * Utility functions for adaptive curvature calculations in mind map connections
 */

export type DirectionSector = 
  | 'north'      // 315°-45°
  | 'northeast'  // 45°-90°
  | 'east'       // 90°-135°
  | 'southeast'  // 135°-180°
  | 'south'      // 180°-225°
  | 'southwest'  // 225°-270°
  | 'west'       // 270°-315°
  | 'northwest'; // 315°-360°/0°-45°

export interface CurvatureConfig {
  intensity: number; // 0-1
  direction: 'clockwise' | 'counterclockwise';
}

/**
 * Calculate the angle between two points in degrees (0-360)
 * 0° = East, 90° = South, 180° = West, 270° = North
 */
export function calculateAngle(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const radians = Math.atan2(dy, dx);
  let degrees = radians * 180 / Math.PI;
  
  // Normalize to 0-360 range
  if (degrees < 0) {
    degrees += 360;
  }
  
  return degrees;
}

/**
 * Determine the directional sector based on angle
 */
export function getDirectionSector(angle: number): DirectionSector {
  // Normalize angle to 0-360
  const normalizedAngle = ((angle % 360) + 360) % 360;
  
  // Perfect 45-degree sectors centered on cardinal/diagonal directions
  if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) {
    return 'east';      // Centered on 0°
  } else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
    return 'southeast'; // Centered on 45°
  } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
    return 'south';     // Centered on 90°
  } else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) {
    return 'southwest'; // Centered on 135°
  } else if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) {
    return 'west';      // Centered on 180°
  } else if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) {
    return 'northwest'; // Centered on 225°
  } else if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) {
    return 'north';     // Centered on 270°
  } else {
    return 'northeast'; // Centered on 315°
  }
}

/**
 * Get optimal curvature configuration for a given direction sector
 */
export function getOptimalCurvature(sector: DirectionSector): CurvatureConfig {
  switch (sector) {
    case 'north':
      return {
        intensity: 0.25, // Moderate curvature for vertical connections
        direction: 'counterclockwise' // North curves left for visual balance
      };
      
    case 'south':
      return {
        intensity: 0.3, // Slightly higher curvature for better visibility
        direction: 'counterclockwise' // South curves left for symmetry with north
      };
      
    case 'east':
    case 'west':
      return {
        intensity: 0.35, // Medium-high curvature for horizontal connections
        direction: 'counterclockwise'
      };
      
    case 'northeast':
    case 'southeast':
    case 'northwest':
    case 'southwest':
      return {
        intensity: 0.45, // High curvature for all diagonals
        direction: 'clockwise' // All diagonals curve outward for symmetry
      };
      
    default:
      return {
        intensity: 0.3,
        direction: 'clockwise'
      };
  }
}

/**
 * Calculate adaptive curvature based on connection angle and optional overrides
 */
export function calculateAdaptiveCurvature(
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: {
    adaptiveCurvature?: boolean;
    curvature?: number;
    curvatureDirection?: 'auto' | 'clockwise' | 'counterclockwise';
  } = {}
): {
  intensity: number;
  direction: 'clockwise' | 'counterclockwise';
  angle: number;
  sector: DirectionSector;
} {
  const angle = calculateAngle(from, to);
  const sector = getDirectionSector(angle);
  
  if (!options.adaptiveCurvature) {
    // Use fixed curvature
    return {
      intensity: options.curvature || 0.3,
      direction: options.curvatureDirection === 'counterclockwise' ? 'counterclockwise' : 'clockwise',
      angle,
      sector
    };
  }
  
  // Use adaptive curvature
  const optimal = getOptimalCurvature(sector);
  
  return {
    intensity: options.curvature || optimal.intensity,
    direction: options.curvatureDirection === 'auto' 
      ? optimal.direction 
      : (options.curvatureDirection || optimal.direction),
    angle,
    sector
  };
}

/**
 * Calculate control point for curved connection using adaptive curvature
 */
export function calculateControlPoint(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  curvatureConfig: {
    intensity: number;
    direction: 'clockwise' | 'counterclockwise';
  }
): { x: number; y: number } {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    return { x: startPoint.x, y: startPoint.y };
  }
  
  const curvatureStrength = curvatureConfig.intensity * distance * 0.5;
  
  // Calculate perpendicular direction
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Apply direction (clockwise vs counterclockwise)
  const directionMultiplier = curvatureConfig.direction === 'clockwise' ? 1 : -1;
  
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;
  
  const controlX = midX + perpX * curvatureStrength * directionMultiplier;
  const controlY = midY + perpY * curvatureStrength * directionMultiplier;
  
  return { x: controlX, y: controlY };
}

/**
 * Debug function to get human-readable curvature info
 */
export function getCurvatureDebugInfo(
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: {
    adaptiveCurvature?: boolean;
    curvature?: number;
    curvatureDirection?: 'auto' | 'clockwise' | 'counterclockwise';
  } = {}
): string {
  const result = calculateAdaptiveCurvature(from, to, options);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return `${result.sector.toUpperCase()} ${Math.round(result.angle)}° - ${result.direction} ${(result.intensity * 100).toFixed(0)}% [dx:${dx.toFixed(0)}, dy:${dy.toFixed(0)}]`;
}