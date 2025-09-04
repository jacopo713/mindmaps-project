/**
 * CurvedConnection Component
 * 
 * Renders a curved connection line between two mind map nodes with:
 * - Animated SVG path for smooth transitions
 * - Enhanced hit area for touch interactions
 * - Selection highlighting
 * - Arrow markers for directional connections
 * - Comprehensive coordinate validation
 * 
 * @author Code Cleanup Specialist
 * @version 2.0.0
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, Marker, Polygon, Text, Rect } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  useDerivedValue,
  useAnimatedStyle
} from 'react-native-reanimated';
import { Connection, MindMapNode as MindMapNodeType } from '../types';
import { 
  calculateAdaptiveCurvature, 
  calculateControlPoint,
  getCurvatureDebugInfo 
} from '../utils/curvature-utils';
import { safeNumber, safeCoordinates } from '../utils/scalingUtils';
import { NodeDimensions } from '../utils/nodeSize';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Constants for visual configuration
const VISUAL_CONFIG = {
  DEFAULT_NODE_WIDTH: 120,
  DEFAULT_NODE_HEIGHT: 65,
  DEFAULT_SCREEN_WIDTH: 400,
  DEFAULT_SCREEN_HEIGHT: 800,
  DEFAULT_CANVAS_CENTER: 2500,
  HIT_AREA_THICKNESS: 20,
  HIT_AREA_RADIUS: 15,
  NODE_GAP_DISTANCE: 40,
  SELECTION_COLOR: 'rgba(255, 215, 0, 0.9)',
  SELECTION_WIDTH: 6,
  DEFAULT_COLOR: '#6b7280',
  DEFAULT_WIDTH: 2
} as const;

// Type definitions
interface SafeCoordinates {
  x: number;
  y: number;
}

interface ConnectionPoints {
  pathData: string;
  controlPoint: SafeCoordinates;
  startPoint: SafeCoordinates;
  endPoint: SafeCoordinates;
  midPoint: SafeCoordinates;
  hitAreaStartPoint: SafeCoordinates;
  hitAreaEndPoint: SafeCoordinates;
}

interface AnchorPointCalculationParams {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  nodeWidth: number;
  nodeHeight: number;
}

interface HitAreaCalculationParams {
  startPoint: SafeCoordinates;
  endPoint: SafeCoordinates;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
}

interface CurvedConnectionProps {
  /** Connection data including styling and properties */
  connection: Connection;
  /** Source node data */
  sourceNode: MindMapNodeType;
  /** Target node data */
  targetNode: MindMapNodeType;
  /** Function to calculate node dimensions based on text */
  getNodeDimensions: (text: string) => NodeDimensions;
  /** Screen width for coordinate calculations */
  screenWidth: number;
  /** Screen height for coordinate calculations */
  screenHeight: number;
  /** Animated X translation value */
  translateX: Animated.SharedValue<number>;
  /** Animated Y translation value */
  translateY: Animated.SharedValue<number>;
  /** Canvas center coordinate */
  canvasCenter: number;
  /** Callback when connection is pressed */
  onConnectionPress?: () => void;
  /** Whether this connection is currently selected */
  isSelected?: boolean;
}

/**
 * CurvedConnection Component
 * 
 * Renders a curved connection between two nodes with enhanced touch handling
 * and visual feedback for selection state.
 */
export default function CurvedConnection({
  connection,
  sourceNode,
  targetNode,
  getNodeDimensions,
  screenWidth,
  screenHeight,
  translateX,
  translateY,
  canvasCenter,
  onConnectionPress,
  isSelected = false
}: CurvedConnectionProps) {
  // Validate all input parameters to prevent NaN propagation
  const validatedParams = useDerivedValue(() => {
    const sourceDimensions = getNodeDimensions(sourceNode.title);
    const targetDimensions = getNodeDimensions(targetNode.title);
    
    return {
      sourceWidth: safeNumber(sourceDimensions.width, VISUAL_CONFIG.DEFAULT_NODE_WIDTH),
      sourceHeight: safeNumber(sourceDimensions.height, VISUAL_CONFIG.DEFAULT_NODE_HEIGHT),
      targetWidth: safeNumber(targetDimensions.width, VISUAL_CONFIG.DEFAULT_NODE_WIDTH),
      targetHeight: safeNumber(targetDimensions.height, VISUAL_CONFIG.DEFAULT_NODE_HEIGHT),
      screenWidth: safeNumber(screenWidth, VISUAL_CONFIG.DEFAULT_SCREEN_WIDTH),
      screenHeight: safeNumber(screenHeight, VISUAL_CONFIG.DEFAULT_SCREEN_HEIGHT),
      canvasCenter: safeNumber(canvasCenter, VISUAL_CONFIG.DEFAULT_CANVAS_CENTER),
      safeSourceNode: {
        ...sourceNode,
        ...safeCoordinates({ x: sourceNode.x, y: sourceNode.y }, { x: 0, y: 0 })
      },
      safeTargetNode: {
        ...targetNode,
        ...safeCoordinates({ x: targetNode.x, y: targetNode.y }, { x: 100, y: 100 })
      }
    };
  });

  /**
   * Validates that a coordinate value is a finite number
   * @param value - The coordinate value to validate
   * @returns Validated coordinate or 0 if invalid
   */
  const validateCoordinate = (value: number): number => {
    'worklet';
    return isNaN(value) || !isFinite(value) ? 0 : value;
  };

  /**
   * Calculates the optimal anchor point on a node edge for connection
   * @param params - Calculation parameters including positions and dimensions
   * @returns Calculated anchor point coordinates
   */
  const calculateAnchorPoint = (params: AnchorPointCalculationParams): SafeCoordinates => {
    'worklet';
    const { fromX, fromY, toX, toY, nodeWidth, nodeHeight } = params;
    
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: fromX, y: fromY };
    
    const normalizedX = dx / distance;
    const normalizedY = dy / distance;
    
    const halfWidth = nodeWidth / 2;
    const halfHeight = nodeHeight / 2;
    
    const absX = Math.abs(normalizedX);
    const absY = Math.abs(normalizedY);
    
    // Calculate intersection with node boundary
    if (halfWidth * absY < halfHeight * absX) {
      // Intersection with left/right edge
      return {
        x: fromX + (normalizedX > 0 ? halfWidth : -halfWidth),
        y: fromY + normalizedY * halfWidth / absX
      };
    } else {
      // Intersection with top/bottom edge
      return {
        x: fromX + normalizedX * halfHeight / absY,
        y: fromY + (normalizedY > 0 ? halfHeight : -halfHeight)
      };
    }
  };

  /**
   * Calculates hit area points away from node edges for better touch targeting
   * @param params - Calculation parameters including points and dimensions
   * @returns Start and end points for hit area
   */
  const calculateHitAreaPoints = (params: HitAreaCalculationParams): {
    startHitPoint: SafeCoordinates;
    endHitPoint: SafeCoordinates;
  } => {
    'worklet';
    const { startPoint, endPoint, sourceWidth, sourceHeight, targetWidth, targetHeight } = params;
    
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) {
      return { startHitPoint: startPoint, endHitPoint: endPoint };
    }
    
    const normalizedX = dx / distance;
    const normalizedY = dy / distance;
    
    // Calculate hit area points with gap from node edges
    const gapDistance = VISUAL_CONFIG.NODE_GAP_DISTANCE;
    
    return {
      startHitPoint: {
        x: startPoint.x + normalizedX * gapDistance,
        y: startPoint.y + normalizedY * gapDistance
      },
      endHitPoint: {
        x: endPoint.x - normalizedX * gapDistance,
        y: endPoint.y - normalizedY * gapDistance
      }
    };
  };

  /**
   * Generates connection path data with proper validation
   */
  function generateConnectionPath(
    startPoint: SafeCoordinates, 
    endPoint: SafeCoordinates, 
    connection: Connection
  ): ConnectionPoints {
    'worklet';
    
    // Calculate midpoint and distance
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;
    
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Handle zero distance case
    if (distance === 0 || isNaN(distance)) {
      return {
        pathData: `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`,
        controlPoint: { x: midX, y: midY },
        startPoint,
        endPoint,
        midPoint: { x: midX, y: midY },
        hitAreaStartPoint: startPoint,
        hitAreaEndPoint: endPoint
      };
    }
    
    // Calculate curve control point
    const curvatureAmount = connection.curvature || 0.3;
    const offset = distance * curvatureAmount * 0.3;
    const perpX = -dy / distance * offset;
    const perpY = dx / distance * offset;
    
    const controlPoint = {
      x: midX + (isNaN(perpX) ? 0 : perpX),
      y: midY + (isNaN(perpY) ? 0 : perpY)
    };
    
    // Validate all coordinates
    const safeStart = {
      x: validateCoordinate(startPoint.x),
      y: validateCoordinate(startPoint.y)
    };
    const safeEnd = {
      x: validateCoordinate(endPoint.x),
      y: validateCoordinate(endPoint.y)
    };
    const safeControl = {
      x: validateCoordinate(controlPoint.x),
      y: validateCoordinate(controlPoint.y)
    };
    
    // Generate path data
    let pathData: string;
    if (connection.type === 'straight') {
      pathData = `M ${safeStart.x} ${safeStart.y} L ${safeEnd.x} ${safeEnd.y}`;
    } else {
      pathData = `M ${safeStart.x} ${safeStart.y} Q ${safeControl.x} ${safeControl.y} ${safeEnd.x} ${safeEnd.y}`;
    }
    
    // Final validation
    const finalPathData = (pathData.includes('NaN') || 
                         pathData.includes('Infinity') || 
                         pathData.includes('undefined')) ? 'M 0 0 L 1 1' : pathData;
    
    // Calculate hit area points
    const hitAreaPoints = calculateHitAreaPoints({
      startPoint: safeStart,
      endPoint: safeEnd,
      sourceWidth: validatedParams.value.sourceWidth,
      sourceHeight: validatedParams.value.sourceHeight,
      targetWidth: validatedParams.value.targetWidth,
      targetHeight: validatedParams.value.targetHeight
    });
    
    return {
      pathData: finalPathData,
      controlPoint: safeControl,
      startPoint: safeStart,
      endPoint: safeEnd,
      midPoint: {
        x: (safeStart.x + safeEnd.x) / 2,
        y: (safeStart.y + safeEnd.y) / 2
      },
      hitAreaStartPoint: hitAreaPoints.startHitPoint,
      hitAreaEndPoint: hitAreaPoints.endHitPoint
    };
  }

  /**
   * Main calculation function for connection points and path data
   * Handles coordinate validation and path generation
   */
  const connectionPoints = useDerivedValue((): ConnectionPoints => {
    'worklet';
    const params = validatedParams.value;
    
    // Enhanced validation for translation values with fallbacks
    const safeTranslateX = validateCoordinate(
      typeof translateX.value === 'number' ? translateX.value : params.canvasCenter
    );
    const safeTranslateY = validateCoordinate(
      typeof translateY.value === 'number' ? translateY.value : params.canvasCenter
    );
    
    // Clamp translation values to prevent extreme values that could cause crashes
    const clampedTranslateX = Math.max(-10000, Math.min(10000, safeTranslateX));
    const clampedTranslateY = Math.max(-10000, Math.min(10000, safeTranslateY));
    
    // Calculate container offset for 3x3 grid
    const containerOffsetX = validateCoordinate(params.screenWidth);
    const containerOffsetY = validateCoordinate(params.screenHeight);
    
    // Calculate source and target positions with enhanced validation
    const sourceX = validateCoordinate(
      containerOffsetX + params.screenWidth / 2 + params.canvasCenter + params.safeSourceNode.x - clampedTranslateX
    );
    const sourceY = validateCoordinate(
      containerOffsetY + params.screenHeight / 2 + params.canvasCenter + params.safeSourceNode.y - clampedTranslateY
    );
    const targetX = validateCoordinate(
      containerOffsetX + params.screenWidth / 2 + params.canvasCenter + params.safeTargetNode.x - clampedTranslateX
    );
    const targetY = validateCoordinate(
      containerOffsetY + params.screenHeight / 2 + params.canvasCenter + params.safeTargetNode.y - clampedTranslateY
    );
    
    // Validate calculated coordinates with additional checks
    const allCoords = [sourceX, sourceY, targetX, targetY];
    if (allCoords.some(coord => isNaN(coord) || !isFinite(coord) || Math.abs(coord) > 50000)) {
      return createFallbackConnectionPoints();
    }
    
    // Calculate anchor points with validation
    const startPoint = calculateAnchorPoint({
      fromX: sourceX,
      fromY: sourceY,
      toX: targetX,
      toY: targetY,
      nodeWidth: params.sourceWidth,
      nodeHeight: params.sourceHeight
    });
    
    const endPoint = calculateAnchorPoint({
      fromX: targetX,
      fromY: targetY,
      toX: sourceX,
      toY: sourceY,
      nodeWidth: params.targetWidth,
      nodeHeight: params.targetHeight
    });
    
    // Validate anchor points with enhanced checks
    const anchorCoords = [startPoint.x, startPoint.y, endPoint.x, endPoint.y];
    if (anchorCoords.some(coord => isNaN(coord) || !isFinite(coord) || Math.abs(coord) > 50000)) {
      return createFallbackConnectionPoints();
    }
    
    // Generate path data
    return generateConnectionPath(startPoint, endPoint, connection);
  });

  /**
   * Creates fallback connection points when calculations fail
   */
  const createFallbackConnectionPoints = (): ConnectionPoints => {
    'worklet';
    return {
      pathData: 'M 0 0 L 1 1',
      controlPoint: { x: 0, y: 0 },
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
      midPoint: { x: 0.5, y: 0.5 },
      hitAreaStartPoint: { x: 0, y: 0 },
      hitAreaEndPoint: { x: 1, y: 1 }
    };
  };

  
  // Animated props for path rendering with enhanced validation
  const animatedPathProps = useAnimatedProps(() => {
    try {
      const pathData = connectionPoints.value.pathData;
      
      // Validate path data
      if (typeof pathData !== 'string' || !pathData || pathData.length === 0) {
        console.warn('[CurvedConnection] Invalid path data:', pathData);
        return { d: 'M 0 0 L 1 1' };
      }
      
      // Check for problematic patterns
      if (pathData.includes('NaN') || pathData.includes('Infinity') || pathData.includes('undefined')) {
        console.warn('[CurvedConnection] Path data contains invalid values:', pathData);
        return { d: 'M 0 0 L 1 1' };
      }
      
      return { d: pathData };
    } catch (error) {
      console.error('[CurvedConnection] Error in animated props:', error);
      return { d: 'M 0 0 L 1 1' };
    }
  });
  
  // Container style for proper positioning
  const containerStyle = useAnimatedStyle(() => {
    const params = validatedParams.value;
    return {
      position: 'absolute' as const,
      top: -params.screenHeight,
      left: -params.screenWidth,
      width: params.screenWidth * 3,
      height: params.screenHeight * 3,
      overflow: 'visible' as const
    };
  });


  /**
   * Renders the main connection path with selection styling
   */
  const renderConnectionPath = () => (
    <AnimatedPath
      animatedProps={animatedPathProps}
      stroke={isSelected ? VISUAL_CONFIG.SELECTION_COLOR : (connection.color || VISUAL_CONFIG.DEFAULT_COLOR)}
      strokeWidth={isSelected ? VISUAL_CONFIG.SELECTION_WIDTH : (connection.width || VISUAL_CONFIG.DEFAULT_WIDTH)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="auto"
      onPress={(event) => {
        console.log('[DEBUG] Connection path tapped:', connection.id);
        onConnectionPress?.();
      }}
      markerEnd={connection.showArrow && connection.arrowPosition === 'end' ? `url(#arrow-${connection.id})` : undefined}
    />
  );

  /**
   * Renders arrow marker definition for directional connections
   */
  const renderArrowMarker = () => (
    <Marker
      id={`arrow-${connection.id}`}
      markerWidth="10"
      markerHeight="10"
      refX="8"
      refY="3"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <Polygon
        points="0,0 0,6 9,3"
        fill={connection.color || VISUAL_CONFIG.DEFAULT_COLOR}
      />
    </Marker>
  );

  /**
   * Renders enhanced hit area for better touch targeting
   */
  const renderHitArea = () => {
    if (!onConnectionPress) return null;
    
    return (
      <>
        {/* Thick invisible path for easier touch targeting */}
        <AnimatedPath
          animatedProps={useAnimatedProps(() => ({
            d: connectionPoints.value.pathData,
          }))}
          stroke="rgba(0, 0, 0, 0)"
          strokeWidth={VISUAL_CONFIG.HIT_AREA_THICKNESS}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="auto"
          onPress={(event) => {
            console.log('[DEBUG] Connection thick hit area tapped:', connection.id);
            onConnectionPress();
          }}
        />
        
        {/* Hit area circles at connection points - disabled for now due to SVG animation issues */}
        {/* TODO: Fix animated hit area circles with proper SVG animation library */}
      </>
    );
  };

  /**
   * Renders debug information for development
   */
  const renderDebugInfo = () => {
    // Debug info would be conditionally rendered in development
    return null;
  };

  return (
    <View style={containerStyle}>
      <AnimatedSvg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible'
        }}
        width={validatedParams.value.screenWidth * 3}
        height={validatedParams.value.screenHeight * 3}
        viewBox={`0 0 ${validatedParams.value.screenWidth * 3} ${validatedParams.value.screenHeight * 3}`}
        preserveAspectRatio="none"
      >
        <Defs>
          {renderArrowMarker()}
        </Defs>
        
        {renderConnectionPath()}
        {renderHitArea()}
        {renderDebugInfo()}
      </AnimatedSvg>
    </View>
  );
}