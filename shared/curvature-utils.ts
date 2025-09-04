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
  
  if (normalizedAngle >= 315 || normalizedAngle < 45) {
    return 'east';
  } else if (normalizedAngle >= 45 && normalizedAngle < 90) {
    return 'southeast';
  } else if (normalizedAngle >= 90 && normalizedAngle < 135) {
    return 'south';
  } else if (normalizedAngle >= 135 && normalizedAngle < 180) {
    return 'southwest';
  } else if (normalizedAngle >= 180 && normalizedAngle < 225) {
    return 'west';
  } else if (normalizedAngle >= 225 && normalizedAngle < 270) {
    return 'northwest';
  } else if (normalizedAngle >= 270 && normalizedAngle < 315) {
    return 'north';
  } else {
    return 'northeast';
  }
}

/**
 * Get optimal curvature configuration for a given direction sector
 */
export function getOptimalCurvature(sector: DirectionSector): CurvatureConfig {
  switch (sector) {
    case 'north':
    case 'south':
      return {
        intensity: 0.25, // Moderate curvature for vertical connections
        direction: 'clockwise'
      };
      
    case 'east':
    case 'west':
      return {
        intensity: 0.35, // Medium-high curvature for horizontal connections
        direction: 'counterclockwise'
      };
      
    case 'northeast':
    case 'southeast':
      return {
        intensity: 0.45, // High curvature for right diagonals
        direction: 'counterclockwise'
      };
      
    case 'northwest':
    case 'southwest':
      return {
        intensity: 0.45, // High curvature for left diagonals
        direction: 'clockwise'
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
  return `${result.sector.toUpperCase()} ${Math.round(result.angle)}° - ${result.direction} ${(result.intensity * 100).toFixed(0)}%`;
}