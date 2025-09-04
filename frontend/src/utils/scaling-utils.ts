/**
 * Frontend scaling utilities for mind map components
 * Provides consistent responsive scaling for web platform
 */

export interface ScreenDimensions {
  width: number;
  height: number;
}

export interface ScalingConfig {
  baseNodeWidth: number;
  baseNodeHeight: number;
  baseGridSize: number;
  baseFontSize: number;
}

export interface ResponsiveScale {
  nodeWidth: number;
  nodeHeight: number;
  fontSize: number;
  scaleFactor: number;
}

// Default configuration
export const DEFAULT_SCALING_CONFIG: ScalingConfig = {
  baseNodeWidth: 140,
  baseNodeHeight: 60,
  baseGridSize: 20,
  baseFontSize: 15,
};

// Fixed grid sizes for different platforms
export const FIXED_GRID_SIZES = {
  web: 20,
  mobile: 18,
} as const;

// Breakpoints for different device categories
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 1024,
  desktop: 1440,
  largeDesktop: 1920,
} as const;

// Scale multipliers for different screen categories
export const SCALE_FACTORS = {
  mobile: 0.75,      // 75% of base size
  tablet: 0.9,       // 90% of base size
  desktop: 1.0,      // 100% of base size (reference)
  largeDesktop: 1.15, // 115% of base size
} as const;

/**
 * Determine device category based on screen width
 */
export function getDeviceCategory(width: number): keyof typeof SCALE_FACTORS {
  if (width < BREAKPOINTS.mobile) {
    return 'mobile';
  } else if (width < BREAKPOINTS.tablet) {
    return 'tablet';
  } else if (width < BREAKPOINTS.largeDesktop) {
    return 'desktop';
  } else {
    return 'largeDesktop';
  }
}

/**
 * Calculate responsive scaling based on screen dimensions
 */
export function calculateResponsiveScale(
  dimensions: ScreenDimensions,
  config: ScalingConfig = DEFAULT_SCALING_CONFIG,
  customScaleFactor?: number
): ResponsiveScale {
  const deviceCategory = getDeviceCategory(dimensions.width);
  const baseFactor = SCALE_FACTORS[deviceCategory];
  
  // Use custom scale factor if provided, otherwise use device-based factor
  const scaleFactor = customScaleFactor ?? baseFactor;
  
  // Additional scaling based on pixel density (if available)
  const densityScale = typeof window !== 'undefined' && window.devicePixelRatio 
    ? Math.min(window.devicePixelRatio * 0.1 + 0.9, 1.2) // Cap at 1.2x
    : 1;
  
  const finalScale = scaleFactor * densityScale;
  
  return {
    nodeWidth: Math.round(config.baseNodeWidth * finalScale),
    nodeHeight: Math.round(config.baseNodeHeight * finalScale),
    fontSize: Math.round(config.baseFontSize * finalScale),
    scaleFactor: finalScale,
  };
}

/**
 * Calculate minimum scale factor to fit content in viewport
 */
export function calculateAutoFitScale(
  contentBounds: { width: number; height: number },
  viewportDimensions: ScreenDimensions,
  padding: number = 50
): number {
  const availableWidth = viewportDimensions.width - (padding * 2);
  const availableHeight = viewportDimensions.height - (padding * 2);
  
  const scaleX = availableWidth / contentBounds.width;
  const scaleY = availableHeight / contentBounds.height;
  
  // Use the smaller scale to ensure content fits in both dimensions
  const scale = Math.min(scaleX, scaleY, 2.0); // Cap at 2x zoom
  
  return Math.max(scale, 0.3); // Minimum 30% scale
}

/**
 * Get suggested zoom levels for manual control
 */
export function getZoomLevels(baseScale: number): number[] {
  return [
    baseScale * 0.5,  // 50%
    baseScale * 0.75, // 75%
    baseScale * 1.0,  // 100% (base)
    baseScale * 1.25, // 125%
    baseScale * 1.5,  // 150%
    baseScale * 2.0,  // 200%
  ];
}

/**
 * Clamp zoom level within reasonable bounds
 */
export function clampZoom(zoom: number, min: number = 0.3, max: number = 3.0): number {
  return Math.max(min, Math.min(max, zoom));
}

/**
 * Calculate smooth zoom increment for +/- buttons
 */
export function getZoomIncrement(currentZoom: number): number {
  if (currentZoom < 0.5) return 0.1;
  if (currentZoom < 1.0) return 0.25;
  if (currentZoom < 2.0) return 0.5;
  return 1.0;
}

/**
 * Format scale factor as percentage for display
 */
export function formatScalePercentage(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

/**
 * Calculate content bounds from mind map nodes
 */
/**
 * Get fixed grid size for platform
 */
export function getFixedGridSize(platform: 'web' | 'mobile' = 'web'): number {
  return FIXED_GRID_SIZES[platform];
}

/**
 * Check if current zoom level allows editing (creation/movement of nodes)
 * Only 100% zoom (±5% tolerance) allows editing for consistency
 */
export function isEditingAllowed(userZoom: number, tolerance: number = 0.05): boolean {
  return Math.abs(userZoom - 1.0) <= tolerance;
}

/**
 * Get user-friendly message for editing restrictions
 */
export function getEditingRestrictionMessage(action: 'create' | 'move'): string {
  const actionText = action === 'create' ? 'create new nodes' : 'move nodes';
  return `Zoom to 100% to ${actionText}. Other zoom levels are for viewing only.`;
}

export function calculateContentBounds(
  nodes: Array<{ x: number; y: number }>,
  nodeScale: ResponsiveScale
): { width: number; height: number; minX: number; minY: number; maxX: number; maxY: number } {
  if (nodes.length === 0) {
    return { width: nodeScale.nodeWidth, height: nodeScale.nodeHeight, minX: 0, minY: 0, maxX: nodeScale.nodeWidth, maxY: nodeScale.nodeHeight };
  }
  
  const xs = nodes.map(node => node.x);
  const ys = nodes.map(node => node.y);
  
  const minX = Math.min(...xs) - nodeScale.nodeWidth / 2;
  const maxX = Math.max(...xs) + nodeScale.nodeWidth / 2;
  const minY = Math.min(...ys) - nodeScale.nodeHeight / 2;
  const maxY = Math.max(...ys) + nodeScale.nodeHeight / 2;
  
  return {
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
    maxX,
    maxY,
  };
}