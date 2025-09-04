import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { getFixedGridSize, getSafeDimensions, safeNumber } from '../utils/scalingUtils';

const { width: screenWidth, height: screenHeight } = getSafeDimensions();
const FIXED_GRID_SIZE = getFixedGridSize('mobile');

interface GridBackgroundProps {
  translateX: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
}

export default function GridBackground({ translateX, translateY }: GridBackgroundProps) {
  // Create animated style for the entire grid
  const gridAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Validate input values to prevent NaN propagation
    const safeTranslateX = isNaN(translateX.value) ? 0 : translateX.value;
    const safeTranslateY = isNaN(translateY.value) ? 0 : translateY.value;
    
    // Simple offset calculation - move grid opposite to translation
    const offsetX = (-safeTranslateX) % FIXED_GRID_SIZE;
    const offsetY = (-safeTranslateY) % FIXED_GRID_SIZE;
    
    return {
      transform: [
        { translateX: isNaN(offsetX) ? 0 : offsetX },
        { translateY: isNaN(offsetY) ? 0 : offsetY },
      ],
    };
  });
  
  // Generate extended grid lines to cover movement
  const verticalLines = [];
  const horizontalLines = [];
  
  // Generate many more lines to avoid regeneration during scroll
  const extraBuffer = FIXED_GRID_SIZE * 10; // Buffer molto più grande
  const gridWidth = screenWidth + extraBuffer * 2;
  const gridHeight = screenHeight + extraBuffer * 2;
  
  // Generate vertical lines - with much larger buffer
  for (let i = -extraBuffer; i <= gridWidth; i += FIXED_GRID_SIZE) {
    verticalLines.push(
      <View
        key={`v-${i}`}
        style={[
          styles.verticalLine,
          { left: i + extraBuffer }
        ]}
      />
    );
  }
  
  // Generate horizontal lines - with much larger buffer
  for (let i = -extraBuffer; i <= gridHeight; i += FIXED_GRID_SIZE) {
    horizontalLines.push(
      <View
        key={`h-${i}`}
        style={[
          styles.horizontalLine,
          { top: i + extraBuffer }
        ]}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.gridContainer, gridAnimatedStyle]}>
        {verticalLines}
        {horizontalLines}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  gridContainer: {
    position: 'absolute',
    width: screenWidth + FIXED_GRID_SIZE * 20, // Molto più grande
    height: screenHeight + FIXED_GRID_SIZE * 20,
    left: -FIXED_GRID_SIZE * 10,
    top: -FIXED_GRID_SIZE * 10,
  },
  verticalLine: {
    position: 'absolute',
    width: 1,
    height: screenHeight + FIXED_GRID_SIZE * 20, // Molto più grande
    backgroundColor: '#e5e7eb',
    top: 0,
  },
  horizontalLine: {
    position: 'absolute',
    height: 1,
    width: screenWidth + FIXED_GRID_SIZE * 20, // Molto più grande
    backgroundColor: '#e5e7eb',
    left: 0,
  },
});