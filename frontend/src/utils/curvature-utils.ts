/**
 * Simple utility functions for mind map connections (mobile-style)
 */

export interface CurvatureConfig {
  intensity: number; // 0-1
  direction: 'clockwise' | 'counterclockwise';
}

/**
 * Simple control point calculation (mobile-style)
 */
export function calculateControlPoint(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  curvature: number = 0.3
): { x: number; y: number } {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    return { x: startPoint.x, y: startPoint.y };
  }
  
  // Simple curvature calculation from mobile app
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;
  
  const offset = distance * curvature * 0.3;
  
  // Perpendicular offset for curve
  const perpX = -dy / distance * offset;
  const perpY = dx / distance * offset;
  
  return {
    x: midX + perpX,
    y: midY + perpY
  };
}