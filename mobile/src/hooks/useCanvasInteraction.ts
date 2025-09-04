/**
 * useCanvasInteraction Hook
 * 
 * Handles all canvas interactions including panning, zooming, and gesture detection.
 * Manages animated values for smooth canvas movements.
 * 
 * @author Code Cleanup Specialist
 * @version 2.0.0
 */
import { useCallback, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  runOnJS
} from 'react-native-reanimated';
import { MindMapNode as MindMapNodeType, Connection, ToolType } from '../types';

/**
 * Hook interface for canvas interaction management
 */
interface UseCanvasInteractionProps {
  /** Currently active tool */
  activeTool: ToolType;
  /** ID of selected connection */
  selectedConnectionId: string | null;
  /** Array of connections */
  connections: Connection[];
  /** Array of nodes */
  nodes: MindMapNodeType[];
  /** Screen width */
  safeWidth: number;
  /** Screen height */
  safeHeight: number;
  /** Canvas center coordinate */
  CANVAS_CENTER: number;
  /** ID of currently editing node */
  currentEditingNodeId: string | null;
  /** Callback for double tap events */
  onDoubleTap: (x: number, y: number) => void;
}

/**
 * Hook return interface
 */
interface UseCanvasInteractionReturn {
  /** Animated X translation value */
  translateX: Animated.SharedValue<number>;
  /** Animated Y translation value */
  translateY: Animated.SharedValue<number>;
  /** Whether canvas is being dragged */
  isDragging: boolean;
  /** Whether a node is being dragged */
  isNodeDragging: boolean;
  /** Function to set node dragging state */
  setIsNodeDragging: React.Dispatch<React.SetStateAction<boolean>>;
  /** Shared zoom level value */
  zoomLevelShared: Animated.SharedValue<number>;
  /** Background pan gesture handler */
  backgroundPanGesture: any;
  /** Single tap gesture handler */
  singleTapGesture: any;
  /** Double tap gesture handler */
  doubleTapGesture: any;
  /** Handler for single tap events */
  handleSingleTap: (x: number, y: number) => void;
}

/**
 * Custom hook for managing canvas interactions
 * 
 * @param props - Configuration props for canvas interaction
 * @returns Object containing animated values and gesture handlers
 */
export function useCanvasInteraction(props: UseCanvasInteractionProps): UseCanvasInteractionReturn {
  const {
    activeTool,
    selectedConnectionId,
    connections,
    nodes,
    safeWidth,
    safeHeight,
    CANVAS_CENTER,
    currentEditingNodeId,
    onDoubleTap
  } = props;

  // Animated values for canvas transformation (same as web offset system)
  const translateX = useSharedValue(CANVAS_CENTER);
  const translateY = useSharedValue(CANVAS_CENTER);
  const zoomLevelShared = useSharedValue(1);
  
  // Helper function to validate and clamp translation values
  const validateAndClampTranslation = useCallback((value: number): number => {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return CANVAS_CENTER;
    }
    return Math.max(-50000, Math.min(50000, value));
  }, [CANVAS_CENTER]);
  
  // State variables
  const [isDragging, setIsDragging] = useState(false);
  const [isNodeDragging, setIsNodeDragging] = useState(false);

  /**
   * Handles single tap events on the canvas
   * Clears selections when tapping on empty areas
   */
  const handleSingleTap = useCallback((x: number, y: number) => {
    // Only handle single tap if not in connection creation mode
    if (activeTool !== 'connection') {
      // Clear connection selection when tapping on empty area
      // This will be handled by the parent component
    }
  }, [activeTool]);

  /**
   * Background pan gesture for canvas panning
   * Only active when not dragging nodes and in select mode
   */
  const backgroundPanGesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      setIsDragging(true);
    })
    .onUpdate((event) => {
      if (activeTool === 'select' && !isNodeDragging) {
        try {
          // Validate event data
          if (!event || typeof event.translationX !== 'number' || typeof event.translationY !== 'number') {
            return;
          }
          
          // Additional validation for translation values
          if (isNaN(event.translationX) || isNaN(event.translationY) || 
              !isFinite(event.translationX) || !isFinite(event.translationY)) {
            return;
          }
          
          // Get current values with validation
          const currentX = validateAndClampTranslation(translateX.value);
          const currentY = validateAndClampTranslation(translateY.value);
          
          // Calculate new position with bounds checking
          const newX = validateAndClampTranslation(currentX + event.translationX);
          const newY = validateAndClampTranslation(currentY + event.translationY);
          
          // Apply changes with additional safety check
          if (isFinite(newX) && isFinite(newY)) {
            translateX.value = newX;
            translateY.value = newY;
          }
        } catch (error) {
          console.warn('[useCanvasInteraction] Error in pan update:', error);
        }
      }
    })
    .onEnd(() => {
      setIsDragging(false);
    })
    .enabled(activeTool === 'select' && !isNodeDragging && currentEditingNodeId === null);

  /**
   * Single tap gesture handler
   * Detects taps on empty canvas areas
   */
  const singleTapGesture = Gesture.Tap()
    .maxDuration(250)
    .onStart((event) => {
      runOnJS(handleSingleTap)(event.x, event.y);
    })
    .enabled(activeTool === 'select' && currentEditingNodeId === null);

  /**
   * Double tap gesture handler
   * Creates new nodes on double tap (same as web system)
   */
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onStart((event) => {
      try {
        // Validate event data
        if (!event || typeof event.x !== 'number' || typeof event.y !== 'number') {
          return;
        }
        
        // Calculate relative coordinates using the same formula as web
        const relativeX = event.x - safeWidth / 2 + translateX.value - CANVAS_CENTER;
        const relativeY = event.y - safeHeight / 2 + translateY.value - CANVAS_CENTER;
        
        runOnJS(onDoubleTap)(relativeX, relativeY);
      } catch (error) {
        console.warn('[useCanvasInteraction] Error in double tap:', error);
      }
    })
    .enabled(activeTool === 'select' && currentEditingNodeId === null);

  return {
    translateX,
    translateY,
    isDragging,
    isNodeDragging,
    setIsNodeDragging,
    zoomLevelShared,
    backgroundPanGesture,
    singleTapGesture,
    doubleTapGesture,
    handleSingleTap
  };
}