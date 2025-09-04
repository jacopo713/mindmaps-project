/**
 * MindMapNode Component
 * 
 * Interactive node component for the mind map.
 * Handles editing, dragging, deletion, and connection creation.
 * 
 * Features:
 * - Double-tap to edit node title
 * - Drag to reposition
 * - Single-tap delete button in top-right corner
 * - Connection mode visual feedback
 * - Comprehensive gesture handling
 * - Performance optimizations with React.memo
 * 
 * @author Code Cleanup Specialist
 * @version 2.0.0
 */
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Keyboard } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  runOnJS,
  SharedValue
} from 'react-native-reanimated';
import { safeNumber, safeCoordinates } from '../utils/scalingUtils';
import { getTextDisplayOptions, NodeDimensions } from '../utils/nodeSize';

// Color constants for consistent theming
const COLORS = {
  BORDER_GRAY: '#e5e7eb',
  EDITING_BLUE: '#3b82f6',
  CONNECTION_ORANGE: '#f59e0b',
  SHADOW_GRAY: '#64748b',
  WHITE: '#ffffff',
  TEXT_SLATE: '#334155',
} as const;

// Configuration constants
const CONFIG = {
  DEFAULT_WIDTH: 120,
  DEFAULT_HEIGHT: 65,
  MIN_WIDTH: 80,
  MIN_HEIGHT: 50,
  DELETE_AREA_SIZE: 25,
  FONT_SIZE_MIN: 12,
  FONT_SIZE_MAX: 18,
  FONT_SIZE_RATIO: 0.107,
  EDIT_TIMEOUT: 100,
  TAP_MAX_DURATION: 250,
  TAP_MAX_DISTANCE: 20,
  HIT_SLOP: 15,
  PAN_MIN_DISTANCE: 1,
  MAX_TITLE_LENGTH: 100,
  CONNECTION_Z_INDEX: 45,
  NORMAL_Z_INDEX: 15,
  TEXT_Z_INDEX: 1,
  OVERLAY_Z_INDEX: -1
} as const;

// Performance tracking
const renderCounts = new Map<string, number>();

interface MindMapNodeProps {
  /** Unique identifier for the node */
  nodeId: string;
  /** Display title of the node */
  title: string;
  /** Border color for the node */
  borderColor?: string;
  /** Background color for the node */
  color?: string;
  /** Width of the node */
  width?: number;
  /** Height of the node */
  height?: number;
  /** X coordinate position */
  x: number;
  /** Y coordinate position */
  y: number;
  /** Animated X translation value */
  translateX: SharedValue<number>;
  /** Animated Y translation value */
  translateY: SharedValue<number>;
  /** Screen width for coordinate calculations */
  screenWidth: number;
  /** Screen height for coordinate calculations */
  screenHeight: number;
  /** Callback when node position changes */
  onPositionChange: (x: number, y: number) => void;
  /** Callback when drag state changes */
  onDragStateChange?: (isDragging: boolean) => void;
  /** Callback for live position updates during drag */
  onLivePositionUpdate?: (x: number, y: number) => void;
  /** Callback when node title changes */
  onTitleChange?: (nodeId: string, newTitle: string) => void;
  /** Callback when edit state changes */
  onEditStateChange?: (nodeId: string, isEditing: boolean) => void;
  /** Whether the node is being edited from parent */
  isEditingFromParent?: boolean;
  /** Callback when node is deleted */
  onDelete?: (nodeId: string) => void;
  /** Callback when node is clicked for connection */
  onConnectionClick?: (nodeId: string) => void;
  /** Whether this node is a connection source */
  isConnectionSource?: boolean;
}


/**
 * MindMapNode Component
 * 
 * Main component implementation with comprehensive gesture handling
 * and state management for interactive mind map nodes.
 */
const MindMapNodeComponent = ({ 
  nodeId,
  title, 
  borderColor = COLORS.BORDER_GRAY,
  color = COLORS.WHITE,
  width = CONFIG.DEFAULT_WIDTH, 
  height = CONFIG.DEFAULT_HEIGHT,
  x,
  y,
  translateX,
  translateY,
  screenWidth,
  screenHeight,
  onPositionChange,
  onDragStateChange,
  onLivePositionUpdate,
  onTitleChange,
  onEditStateChange,
  isEditingFromParent = false,
  onDelete,
  onConnectionClick,
  isConnectionSource = false,
}: MindMapNodeProps) => {
  // Track renders for performance monitoring
  const currentCount = renderCounts.get(nodeId) || 0;
  renderCounts.set(nodeId, currentCount + 1);
  
  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const inputRef = useRef<TextInput>(null);
  
  // Animated values
  const nodeTranslateX = useSharedValue(safeNumber(x, 0));
  const nodeTranslateY = useSharedValue(safeNumber(y, 0));
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Effects for state synchronization with enhanced validation
  React.useEffect(() => {
    try {
      const validatedX = safeNumber(x, 0);
      const validatedY = safeNumber(y, 0);
      
      if (nodeTranslateX.value !== validatedX || nodeTranslateY.value !== validatedY) {
        nodeTranslateX.value = validatedX;
        nodeTranslateY.value = validatedY;
      }
    } catch (error) {
      console.error('[MindMapNode] Error in position sync effect:', error);
    }
  }, [x, y, nodeTranslateX, nodeTranslateY]);

  React.useEffect(() => {
    try {
      if (!isEditing && editTitle !== title) {
        setEditTitle(title);
      }
    } catch (error) {
      console.error('[MindMapNode] Error in title sync effect:', error);
    }
  }, [title, isEditing, editTitle]);

  // Handle forced exit from parent with improved error handling
  React.useEffect(() => {
    try {
      if (isEditingFromParent === false && isEditing) {
        handleEditConfirm();
      }
    } catch (error) {
      console.error('[MindMapNode] Error in forced exit effect:', error);
      // Fallback: just cancel editing
      setIsEditing(false);
      setEditTitle(title);
    }
  }, [isEditingFromParent, isEditing, handleEditConfirm, title]);

  // Position update handler with validation
  const updatePosition = useCallback((newX: number, newY: number) => {
    try {
      // Validate coordinates before updating
      const validatedX = safeNumber(newX, 0);
      const validatedY = safeNumber(newY, 0);
      
      if (isNaN(validatedX) || isNaN(validatedY) || !isFinite(validatedX) || !isFinite(validatedY)) {
        console.warn('[MindMapNode] Invalid coordinates in updatePosition:', { newX, newY });
        return;
      }
      
      onPositionChange(validatedX, validatedY);
    } catch (error) {
      console.error('[MindMapNode] Error in position update:', error);
    }
  }, [onPositionChange]);

  // Edit mode handlers
  const handleEditConfirm = useCallback(() => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== title) {
      onTitleChange?.(nodeId, trimmedTitle);
    }
    setIsEditing(false);
    onEditStateChange?.(nodeId, false);
    Keyboard.dismiss();
  }, [editTitle, title, nodeId, onTitleChange, onEditStateChange]);

  const handleEditCancel = useCallback(() => {
    console.log(`[MindMapNode] handleEditCancel called for node ${nodeId}`, {
      isEditing,
      timestamp: Date.now()
    });
    
    setEditTitle(title);
    setIsEditing(false);
    onEditStateChange?.(nodeId, false);
    Keyboard.dismiss();
  }, [title, nodeId, isEditing, onEditStateChange]);

  const startEditing = useCallback(() => {
    if (isEditing) return;
    
    setIsEditing(true);
    setEditTitle(title);
    onEditStateChange?.(nodeId, true);
    
    // Focus input with delay to avoid worklet conflicts
    setTimeout(() => {
      inputRef.current?.focus();
    }, CONFIG.EDIT_TIMEOUT);
  }, [isEditing, title, nodeId, onEditStateChange]);

  // Delete handler
  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(nodeId);
    }
  }, [onDelete, nodeId]);

  // Gesture definitions with enhanced error handling and validation
  const tapGesture = Gesture.Tap()
    .maxDuration(CONFIG.TAP_MAX_DURATION)
    .maxDistance(CONFIG.TAP_MAX_DISTANCE)
    .hitSlop(CONFIG.HIT_SLOP)
    .onEnd((event) => {
      'worklet';
      try {
        console.log(`[MindMapNode] Tap gesture for node ${nodeId}`, {
          x: event.x,
          y: event.y,
          isEditing,
          hasOnDelete: !!onDelete
        });
        
        // Prevent actions during editing
        if (isEditing) return;
        
        // Validate event coordinates
        if (typeof event.x !== 'number' || typeof event.y !== 'number' || 
            isNaN(event.x) || isNaN(event.y)) {
          console.warn('[MindMapNode] Invalid tap event coordinates:', event);
          return;
        }
        
        // Check if tap is in delete area (top-right corner)
        const nodeWidth = safeNumber(width, CONFIG.DEFAULT_WIDTH);
        const isInDeleteArea = 
          event.x >= nodeWidth - CONFIG.DELETE_AREA_SIZE && 
          event.y <= CONFIG.DELETE_AREA_SIZE;
        
        if (isInDeleteArea && onDelete) {
          runOnJS(handleDelete)();
        } else if (onConnectionClick) {
          runOnJS(onConnectionClick)(nodeId);
        }
      } catch (error) {
        console.error('[MindMapNode] Error in tap gesture handler:', error);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(CONFIG.TAP_MAX_DURATION)
    .maxDistance(CONFIG.TAP_MAX_DISTANCE)
    .hitSlop(CONFIG.HIT_SLOP)
    .onEnd(() => {
      'worklet';
      try {
        runOnJS(startEditing)();
      } catch (error) {
        console.error('[MindMapNode] Error in double tap gesture handler:', error);
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(!isEditing)
    .minDistance(CONFIG.PAN_MIN_DISTANCE)
    .hitSlop(CONFIG.HIT_SLOP)
    .onStart((event) => {
      'worklet';
      try {
        // Prevent drag if starting in delete area
        const nodeWidth = safeNumber(width, CONFIG.DEFAULT_WIDTH);
        if (event.x >= nodeWidth - CONFIG.DELETE_AREA_SIZE && 
            event.y <= CONFIG.DELETE_AREA_SIZE) {
          return;
        }
        
        isDragging.value = true;
        startX.value = nodeTranslateX.value;
        startY.value = nodeTranslateY.value;
        
        if (onDragStateChange) {
          runOnJS(onDragStateChange)(true);
        }
      } catch (error) {
        console.error('[MindMapNode] Error in pan gesture start:', error);
      }
    })
    .onUpdate((event) => {
      'worklet';
      try {
        // Validate translation values
        const translationX = safeNumber(event.translationX, 0);
        const translationY = safeNumber(event.translationY, 0);
        
        nodeTranslateX.value = startX.value + translationX;
        nodeTranslateY.value = startY.value + translationY;
        
        if (onLivePositionUpdate) {
          runOnJS(onLivePositionUpdate)(nodeTranslateX.value, nodeTranslateY.value);
        }
      } catch (error) {
        console.error('[MindMapNode] Error in pan gesture update:', error);
      }
    })
    .onEnd(() => {
      'worklet';
      try {
        isDragging.value = false;
        runOnJS(updatePosition)(nodeTranslateX.value, nodeTranslateY.value);
        
        if (onDragStateChange) {
          runOnJS(onDragStateChange)(false);
        }
      } catch (error) {
        console.error('[MindMapNode] Error in pan gesture end:', error);
      }
    })
    .onFinalize(() => {
      'worklet';
      try {
        isDragging.value = false;
        
        if (onDragStateChange) {
          runOnJS(onDragStateChange)(false);
        }
      } catch (error) {
        console.error('[MindMapNode] Error in pan gesture finalize:', error);
      }
    });

  // Compose gestures for optimal interaction with error handling
  const composedGesture = React.useMemo(() => {
    try {
      return Gesture.Race(doubleTapGesture, tapGesture, panGesture);
    } catch (error) {
      console.error('[MindMapNode] Error composing gestures:', error);
      // Fallback to basic tap gesture
      return tapGesture;
    }
  }, [doubleTapGesture, tapGesture, panGesture]);

  // Enhanced coordinate validation function
  const validateCoordinate = (value: number, fallback: number, name: string): number => {
    'worklet';
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      console.warn(`[MindMapNode] Invalid ${name}: ${value}, using fallback: ${fallback}`);
      return fallback;
    }
    
    // Clamp to reasonable bounds to prevent extreme positions
    const clamped = Math.max(-50000, Math.min(50000, value));
    if (clamped !== value) {
      console.warn(`[MindMapNode] Clamped ${name}: ${value} to ${clamped}`);
    }
    
    return clamped;
  };
  
  // Animated style with enhanced validation and error handling
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    
    try {
      // Validate all input values with comprehensive checks
      const safeNodeX = validateCoordinate(nodeTranslateX.value, 0, 'nodeTranslateX');
      const safeNodeY = validateCoordinate(nodeTranslateY.value, 0, 'nodeTranslateY');
      const safeTranslateX = validateCoordinate(translateX.value, 0, 'translateX');
      const safeTranslateY = validateCoordinate(translateY.value, 0, 'translateY');
      const safeScreenWidth = validateCoordinate(screenWidth, CONFIG.DEFAULT_WIDTH * 3, 'screenWidth');
      const safeScreenHeight = validateCoordinate(screenHeight, CONFIG.DEFAULT_HEIGHT * 10, 'screenHeight');
      const safeWidth = validateCoordinate(width, CONFIG.DEFAULT_WIDTH, 'width');
      const safeHeight = validateCoordinate(height, CONFIG.DEFAULT_HEIGHT, 'height');
      
      // Calculate position relative to screen center
      const centerX = safeScreenWidth / 2;
      const centerY = safeScreenHeight / 2;
      
      // Node position in screen coordinates
      const screenX = centerX + (safeNodeX - safeTranslateX);
      const screenY = centerY + (safeNodeY - safeTranslateY);
      
      // Final position with node center adjustment
      const finalX = screenX - safeWidth / 2;
      const finalY = screenY - safeHeight / 2;
      
      // Final validation of results
      const validatedFinalX = validateCoordinate(finalX, 0, 'finalX');
      const validatedFinalY = validateCoordinate(finalY, 0, 'finalY');
      
      return {
        transform: [
          { translateX: validatedFinalX },
          { translateY: validatedFinalY },
        ],
      };
    } catch (error) {
      console.error('[MindMapNode] Error in animated style calculation:', error);
      return {
        transform: [
          { translateX: 0 },
          { translateY: 0 },
        ],
      };
    }
  });

  // Memoized text display calculations for performance
  const textDisplayOptions = useMemo(() => {
    const actualWidth = safeNumber(width, CONFIG.DEFAULT_WIDTH);
    const actualHeight = safeNumber(height, CONFIG.DEFAULT_HEIGHT);
    const nodeDimensions: NodeDimensions = { width: actualWidth, height: actualHeight };
    const textOptions = getTextDisplayOptions(title, nodeDimensions);
    
    return {
      actualWidth,
      actualHeight,
      nodeDimensions,
      optimalLines: textOptions.optimalLines,
      shouldEllipsize: textOptions.showEllipsis,
      fontSize: Math.max(CONFIG.FONT_SIZE_MIN, 
                   Math.min(CONFIG.FONT_SIZE_MAX, 
                            safeNumber(width, CONFIG.DEFAULT_WIDTH) * CONFIG.FONT_SIZE_RATIO))
    };
  }, [title, width, height, nodeId]);

  // Render functions for better code organization
  const renderEditingInput = () => (
    <TextInput
      ref={inputRef}
      value={editTitle}
      onChangeText={setEditTitle}
      onSubmitEditing={handleEditConfirm}
      style={[
        styles.textInput,
        { 
          fontSize: textDisplayOptions.fontSize,
          zIndex: CONFIG.TEXT_Z_INDEX 
        }
      ]}
      placeholder="Rinomina nodo..."
      placeholderTextColor="#9ca3af"
      maxLength={CONFIG.MAX_TITLE_LENGTH}
      multiline={true}
      numberOfLines={textDisplayOptions.optimalLines}
      textAlign="left"
      textAlignVertical="top"
      selectTextOnFocus
      autoFocus
      returnKeyType="done"
      blurOnSubmit
    />
  );
  
  const renderDisplayText = () => (
    <View style={{ position: 'relative' }}>
      <Text 
        style={[
          styles.title,
          { 
            fontSize: textDisplayOptions.fontSize,
            zIndex: CONFIG.TEXT_Z_INDEX 
          }
        ]} 
        numberOfLines={textDisplayOptions.shouldEllipsize ? textDisplayOptions.optimalLines : 0}
        ellipsizeMode={textDisplayOptions.shouldEllipsize ? "tail" : "clip"}
      >
        {title}
      </Text>
    </View>
  );
  
  const renderConnectionBorderOverlay = () => (
    <View style={styles.connectionBorderOverlay} />
  );
  
  // Main render
  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View 
        style={[
          styles.container, 
          {
            // Stable border configuration
            borderTopColor: COLORS.BORDER_GRAY,
            borderRightColor: COLORS.BORDER_GRAY, 
            borderBottomColor: COLORS.BORDER_GRAY,
            borderLeftColor: borderColor,
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderLeftWidth: 3,
            backgroundColor: color,
            width: safeNumber(width, CONFIG.DEFAULT_WIDTH),
            height: safeNumber(height, CONFIG.DEFAULT_HEIGHT),
            position: 'absolute',
            zIndex: isConnectionSource ? CONFIG.CONNECTION_Z_INDEX : CONFIG.NORMAL_Z_INDEX,
            shadowColor: isConnectionSource ? COLORS.CONNECTION_ORANGE : COLORS.SHADOW_GRAY,
            shadowOpacity: isConnectionSource ? 0.5 : 0.04,
            elevation: isConnectionSource ? 10 : 2,
          },
          animatedStyle
        ]}>
        {/* Connection mode border overlay */}
        {isConnectionSource && renderConnectionBorderOverlay()}
        
        {/* Content based on editing state */}
        {isEditing ? renderEditingInput() : renderDisplayText()}
      </Animated.View>
    </GestureDetector>
  );
}

// Styles with improved organization and documentation
const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.SHADOW_GRAY,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  connectionBorderOverlay: {
    position: 'absolute',
    left: -3, // Offset to cover existing border
    top: -1,
    bottom: -1,
    width: 6, // 3px extra for visual effect
    backgroundColor: COLORS.CONNECTION_ORANGE,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    zIndex: CONFIG.OVERLAY_Z_INDEX,
  },
  title: {
    color: COLORS.TEXT_SLATE,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  textInput: {
    color: COLORS.TEXT_SLATE,
    fontWeight: '600',
    textAlign: 'left',
    lineHeight: 20,
    letterSpacing: 0.2,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    textAlignVertical: 'top',
  },
});

/**
 * Custom comparison function for React.memo
 * Prevents unnecessary re-renders by performing deep comparison of props
 */
const arePropsEqual = (prevProps: MindMapNodeProps, nextProps: MindMapNodeProps): boolean => {
  // Basic props comparison
  const basicPropsChanged = [
    'nodeId', 'title', 'borderColor', 'color', 'width', 'height',
    'x', 'y', 'screenWidth', 'screenHeight', 'isEditingFromParent', 'isConnectionSource'
  ].some(prop => {
    const key = prop as keyof MindMapNodeProps;
    return prevProps[key] !== nextProps[key];
  });
  
  if (basicPropsChanged) return false;
  
  // Function props comparison (reference equality)
  const functionPropsChanged = [
    'onPositionChange', 'onDragStateChange', 'onLivePositionUpdate',
    'onTitleChange', 'onEditStateChange', 'onDelete', 'onConnectionClick'
  ].some(prop => {
    const key = prop as keyof MindMapNodeProps;
    return prevProps[key] !== nextProps[key];
  });
  
  if (functionPropsChanged) return false;
  
  // Note: SharedValue comparison is skipped to prevent render-time access
  // Position updates are handled via useEffect instead
  
  return true;
};

// Export the memoized component with custom comparison
export default React.memo(MindMapNodeComponent, arePropsEqual);