import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  runOnJS
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface DrawingCanvasProps {
  isActive: boolean;
  screenWidth: number;
  screenHeight: number;
  translateX: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
  canvasCenter: number;
  onDrawingChange?: (strokes: Stroke[]) => void;
}

const STORAGE_KEY = 'mindmap_drawings';

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isActive,
  screenWidth,
  screenHeight,
  translateX,
  translateY,
  canvasCenter,
  onDrawingChange
}) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useSharedValue<Point[]>([]);
  const isDrawing = useSharedValue(false);

  // Drawing settings
  const strokeColor = '#2563eb';
  const strokeWidth = 4; // Slightly thicker for mobile

  // Load saved drawings on mount
  React.useEffect(() => {
    const loadDrawings = async () => {
      try {
        const savedDrawings = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedDrawings) {
          const drawings = JSON.parse(savedDrawings);
          setStrokes(drawings);
        }
      } catch (error) {
        console.log('Error loading drawings:', error);
      }
    };

    if (isActive) {
      loadDrawings();
    }
  }, [isActive]);

  // Save drawings to storage
  const saveDrawings = useCallback(async (newStrokes: Stroke[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newStrokes));
      onDrawingChange?.(newStrokes);
    } catch (error) {
      console.log('Error saving drawings:', error);
    }
  }, [onDrawingChange]);

  // Convert points to SVG path string
  const pointsToPath = useCallback((points: Point[]): string => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    // Use quadratic curves for smoother drawing
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
    }
    
    // Add the last point
    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      path += ` T ${lastPoint.x} ${lastPoint.y}`;
    }
    
    return path;
  }, []);

  // Handle drawing start
  const handleDrawStart = useCallback((x: number, y: number) => {
    currentStroke.value = [{ x, y }];
    isDrawing.value = true;
  }, []);

  // Handle drawing move
  const handleDrawMove = useCallback((x: number, y: number) => {
    if (!isDrawing.value) return;
    
    currentStroke.value = [...currentStroke.value, { x, y }];
    // Force re-render to show live drawing
    setStrokes(prev => [...prev]);
  }, []);

  // Handle drawing end
  const handleDrawEnd = useCallback(() => {
    if (!isDrawing.value || currentStroke.value.length < 2) {
      isDrawing.value = false;
      return;
    }

    const newStroke: Stroke = {
      id: Date.now().toString(),
      points: [...currentStroke.value],
      color: strokeColor,
      width: strokeWidth
    };

    setStrokes(prev => {
      const newStrokes = [...prev, newStroke];
      saveDrawings(newStrokes);
      return newStrokes;
    });

    currentStroke.value = [];
    isDrawing.value = false;
  }, [saveDrawings, strokeColor, strokeWidth]);

  // Drawing gesture - memoize to prevent recreation
  const drawingGesture = React.useMemo(() => 
    Gesture.Pan()
      .onBegin((event) => {
        'worklet';
        if (!isActive) return;
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = event.x + translateX.value - screenWidth / 2;
        const canvasY = event.y + translateY.value - screenHeight / 2;
        
        runOnJS(handleDrawStart)(canvasX, canvasY);
      })
      .onUpdate((event) => {
        'worklet';
        if (!isActive || !isDrawing.value) return;
        
        // Convert screen coordinates to canvas coordinates  
        const canvasX = event.x + translateX.value - screenWidth / 2;
        const canvasY = event.y + translateY.value - screenHeight / 2;
        
        runOnJS(handleDrawMove)(canvasX, canvasY);
      })
      .onEnd(() => {
        'worklet';
        if (!isActive) return;
        runOnJS(handleDrawEnd)();
      })
      .onFinalize(() => {
        'worklet';
        if (!isActive) return;
        runOnJS(handleDrawEnd)();
      }),
    [isActive, handleDrawStart, handleDrawMove, handleDrawEnd, translateX, translateY, screenWidth, screenHeight]
  );

  // Clear all drawings
  const clearDrawing = useCallback(() => {
    setStrokes([]);
    saveDrawings([]);
  }, [saveDrawings]);

  // Container animated style
  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: -translateX.value + screenWidth / 2 },
        { translateY: -translateY.value + screenHeight / 2 },
      ],
    };
  });

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]}>
      {isActive ? (
        <GestureDetector gesture={drawingGesture} key="drawing-gesture-detector">
          <View style={StyleSheet.absoluteFillObject}>
            <Animated.View style={[StyleSheet.absoluteFillObject, containerStyle]}>
            <Svg 
              width={screenWidth * 3} 
              height={screenHeight * 3}
              style={{ 
                position: 'absolute',
                left: -screenWidth,
                top: -screenHeight,
              }}
            >
              <G>
                {/* Completed strokes */}
                {strokes.map((stroke) => (
                  <Path
                    key={stroke.id}
                    d={pointsToPath(stroke.points)}
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.8}
                  />
                ))}
                
                {/* Current stroke being drawn */}
                {isDrawing.value && currentStroke.value.length > 0 && (
                  <Path
                    d={pointsToPath(currentStroke.value)}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.6}
                  />
                )}
              </G>
            </Svg>
            </Animated.View>
        </View>
      </GestureDetector>
      ) : (
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View style={[StyleSheet.absoluteFillObject, containerStyle]}>
            <Svg 
              width={screenWidth * 3} 
              height={screenHeight * 3}
              style={{ 
                position: 'absolute',
                left: -screenWidth,
                top: -screenHeight,
              }}
            >
              <G>
                {/* Completed strokes */}
                {strokes.map((stroke) => (
                  <Path
                    key={stroke.id}
                    d={pointsToPath(stroke.points)}
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.8}
                  />
                ))}
              </G>
            </Svg>
          </Animated.View>
        </View>
      )}
      
      {/* Clear button */}
      {strokes.length > 0 && (
        <View style={styles.clearButtonContainer}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearDrawing}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>Cancella tutto</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  clearButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1001, // zIndex: 1001 per pulsante clear (sopra tutti)
  },
  clearButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DrawingCanvas;