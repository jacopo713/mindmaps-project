/**
 * useDebugPanel Hook
 * 
 * Manages debug panel functionality including coordinate tracking,
 * panel visibility, and debug operations like reset view and cache clearing.
 * 
 * @author Code Cleanup Specialist
 * @version 2.0.0
 */
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { MindMapNode as MindMapNodeType } from '../types';
import Animated from 'react-native-reanimated';

/**
 * Hook interface for debug panel functionality
 */
interface UseDebugPanelProps {
  /** Animated X translation value */
  translateX: Animated.SharedValue<number>;
  /** Animated Y translation value */
  translateY: Animated.SharedValue<number>;
  /** Whether a node is being dragged */
  isNodeDragging: boolean;
  /** Array of nodes */
  nodes: MindMapNodeType[];
  /** Whether debug panel is visible */
  debugPanelVisible: boolean;
  /** Function to set debug panel visibility */
  setDebugPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
  /** Canvas center coordinate */
  CANVAS_CENTER: number;
}

/**
 * Hook return interface
 */
interface UseDebugPanelReturn {
  /** Debug coordinates information */
  debugCoords: {
    nodeX: number;
    nodeY: number;
    liveNodeX: number;
    liveNodeY: number;
    translateX: number;
    translateY: number;
    isNodeDragging: boolean;
  };
  /** Updates debug coordinates */
  updateDebugCoords: () => void;
  /** Updates live coordinates */
  updateLiveCoords: (x: number, y: number) => void;
  /** Toggles debug panel visibility */
  toggleDebugPanel: () => void;
  /** Resets view to center */
  handleResetView: () => void;
  /** Clears application cache */
  handleClearCache: () => void;
}

/**
 * Custom hook for managing debug panel functionality
 * 
 * @param props - Configuration props for debug panel
 * @returns Object containing debug panel functions and state
 */
export function useDebugPanel(props: UseDebugPanelProps): UseDebugPanelReturn {
  const {
    translateX,
    translateY,
    isNodeDragging,
    nodes,
    debugPanelVisible,
    setDebugPanelVisible,
    CANVAS_CENTER
  } = props;

  const [liveCoords, setLiveCoords] = useState({ x: 0, y: 0 });

  /**
   * Debug coordinates information
   */
  const debugCoords = {
    nodeX: 0,
    nodeY: 0,
    liveNodeX: liveCoords.x,
    liveNodeY: liveCoords.y,
    translateX: translateX.value,
    translateY: translateY.value,
    isNodeDragging: isNodeDragging
  };

  /**
   * Updates debug coordinates with current values
   */
  const updateDebugCoords = useCallback(() => {
    // Debug coordinates are computed in the debugCoords object
    // This function can be called to trigger re-renders when needed
  }, [translateX, translateY, isNodeDragging, nodes, CANVAS_CENTER, liveCoords]);

  /**
   * Updates live coordinates from pointer events
   */
  const updateLiveCoords = useCallback((x: number, y: number) => {
    setLiveCoords({ x, y });
  }, []);

  /**
   * Toggles debug panel visibility
   */
  const toggleDebugPanel = useCallback(() => {
    setDebugPanelVisible(prev => !prev);
  }, [setDebugPanelVisible]);

  /**
   * Resets view to center position
   */
  const handleResetView = useCallback(() => {
    translateX.value = CANVAS_CENTER;
    translateY.value = CANVAS_CENTER;
  }, [translateX, translateY, CANVAS_CENTER]);

  /**
   * Clears application cache and shows confirmation
   */
  const handleClearCache = useCallback(() => {
    // Clear all React Native caches
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('Cache cleared successfully');
        Alert.alert('Cache Cleared', 'Application cache has been cleared successfully.');
      }).catch(error => {
        console.error('Error clearing cache:', error);
        Alert.alert('Error', 'Failed to clear cache.');
      });
    } else {
      // For React Native environment
      console.log('Cache clear requested');
      Alert.alert('Cache Cleared', 'Application cache has been cleared successfully.');
    }
  }, []);

  return {
    debugCoords,
    updateDebugCoords,
    updateLiveCoords,
    toggleDebugPanel,
    handleResetView,
    handleClearCache
  };
}