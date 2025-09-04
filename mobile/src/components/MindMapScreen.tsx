/**
 * MindMapScreen Component
 * 
 * Main screen component for the mind map application.
 * Handles node creation, manipulation, connections, and canvas interactions.
 * 
 * Features:
 * - Interactive node creation and editing
 * - Connection management between nodes
 * - Canvas panning and zooming
 * - Import/export functionality
 * - Debug panel for development
 * 
 * @author Code Cleanup Specialist
 * @version 2.0.0
 */
import React, { useMemo, useCallback, useEffect } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Alert
} from 'react-native';
import ErrorBoundary from './ErrorBoundary';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS
} from 'react-native-reanimated';
import GridBackground from './GridBackground';
import MindMapNode from './MindMapNode';
import CurvedConnection from './CurvedConnection';
import ToolBar from './ToolBar';
import DrawingCanvas from './DrawingCanvas';
import DebugPanel from './DebugPanel';
import { StorageManager } from '../utils/storage';
import { MindMapNode as MindMapNodeType, Connection, ToolType } from '../types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  getFixedGridSize,
  getSafeDimensions,
  safeNumber
} from '../utils/scalingUtils';
import { calculateNodeSize, getDefaultNodeSize } from '../utils/nodeSize';

// Custom hooks for state management
import { useMindMapState } from '../hooks/useMindMapState';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { useNodeOperations } from '../hooks/useNodeOperations';
import { useConnectionOperations } from '../hooks/useConnectionOperations';
import { useDebugPanel } from '../hooks/useDebugPanel';
import { useExportImport } from '../hooks/useExportImport';

// Canvas configuration constants
const CANVAS_SIZE = 5000;
const CANVAS_CENTER = CANVAS_SIZE / 2;

// Screen dimensions
const { width: safeWidth, height: safeHeight } = getSafeDimensions();

// UI Configuration
const UI_CONFIG = {
  NODE_DELETE_AREA_SIZE: 25,
  CONNECTION_TIMEOUT: 3000,
  CACHE_CLEAR_THRESHOLD: 20
} as const;

// Component props interface
interface MindMapScreenProps {
  /** Callback to navigate back to chat */
  onBackToChat: () => void;
  /** Optional callback to toggle sidebar */
  onToggleSidebar?: () => void;
}

/**
 * MindMapScreen Component
 * 
 * Main component that orchestrates the mind map application.
 * Uses custom hooks to manage different aspects of the application state.
 */
export default function MindMapScreen({ onBackToChat, onToggleSidebar }: MindMapScreenProps) {
  // Custom hooks for state management
  const {
    nodes,
    connections,
    currentEditingNodeId,
    connectionSourceNodeId,
    selectedConnectionId,
    currentMindMapId,
    activeTool,
    zoomLevel,
    isZoomEnabled,
    debugPanelVisible,
    sessionStartTime,
    setNodes,
    setConnections,
    setCurrentEditingNodeId,
    setConnectionSourceNodeId,
    setSelectedConnectionId,
    setCurrentMindMapId,
    setActiveTool,
    setZoomLevel,
    setIsZoomEnabled,
    setDebugPanelVisible,
    connectionTimeoutRef
  } = useMindMapState();
  
  // Node operations
  const {
    handleNodePositionChange,
    handleTitleChange,
    handleEditStateChange,
    handleNodeDelete,
    createNewNodeMobile
  } = useNodeOperations({
    nodes,
    setNodes,
    currentEditingNodeId,
    connectionSourceNodeId,
    setConnectionSourceNodeId,
    setSelectedConnectionId,
    setCurrentEditingNodeId,
    setConnections
  });
  
  // Canvas interaction handling
  const {
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
  } = useCanvasInteraction({
    activeTool,
    selectedConnectionId,
    connections,
    nodes,
    safeWidth,
    safeHeight,
    CANVAS_CENTER,
    currentEditingNodeId,
    onDoubleTap: createNewNodeMobile
  });
  
  // Connection operations
  const {
    createConnection,
    handleConnectionClick,
    handleConnectionDelete,
    handleConnectionSelect,
    handleSelectedConnectionDelete,
    connectionTimeoutRef: connectionOperationsTimeoutRef
  } = useConnectionOperations({
    connections,
    setConnections,
    connectionSourceNodeId,
    setConnectionSourceNodeId,
    selectedConnectionId,
    setSelectedConnectionId,
    currentEditingNodeId,
    setCurrentEditingNodeId
  });
  
  // Debug panel functionality
  const {
    debugCoords,
    updateDebugCoords,
    updateLiveCoords,
    toggleDebugPanel,
    handleResetView,
    handleClearCache
  } = useDebugPanel({
    translateX,
    translateY,
    isNodeDragging,
    nodes,
    debugPanelVisible,
    setDebugPanelVisible,
    CANVAS_CENTER
  });
  
  // Export/Import functionality
  const {
    exportMindMap,
    importMindMap
  } = useExportImport({
    currentMindMapId,
    nodes,
    connections
  });
  
  // Handle node drag state changes
  const handleNodeDragStateChange = useCallback((isDragging: boolean) => {
    setIsNodeDragging(isDragging);
  }, [setIsNodeDragging]);
  
  // Handle live position updates during dragging
  const handleNodeLivePositionUpdate = useCallback((liveX: number, liveY: number) => {
    updateLiveCoords(liveX, liveY);
  }, [updateLiveCoords]);
  
  // Base node dimensions
  const { width: baseNodeWidth, height: baseNodeHeight } = getDefaultNodeSize();
  const fontSize = 15;
  
  // Zoom control
  const toggleZoom = useCallback(() => {
    const newZoomEnabled = !isZoomEnabled;
    const newZoomLevel = newZoomEnabled ? 0.75 : 1.0;
    setIsZoomEnabled(newZoomEnabled);
    setZoomLevel(newZoomLevel);
    zoomLevelShared.value = newZoomLevel;
  }, [isZoomEnabled, zoomLevelShared, setIsZoomEnabled, setZoomLevel]);
  
  // Tool change handler
  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    
    // Clear any active states when switching tools
    if (currentEditingNodeId) {
      setCurrentEditingNodeId(null);
    }
    if (connectionSourceNodeId) {
      setConnectionSourceNodeId(null);
    }
    if (selectedConnectionId) {
      setSelectedConnectionId(null);
    }
  }, [currentEditingNodeId, connectionSourceNodeId, selectedConnectionId, setActiveTool, setCurrentEditingNodeId, setConnectionSourceNodeId, setSelectedConnectionId]);

  // Removed node dimensions cache - using simple function instead
  
  // Position key for forcing re-renders when position changes significantly
  const [positionKey, setPositionKey] = React.useState(0);
  
  // Update position key when position changes significantly
  useAnimatedReaction(
    () => ({
      translateX: translateX.value,
      translateY: translateY.value
    }),
    (result, previous) => {
      if (!previous || 
          Math.abs(result.translateX - previous.translateX) > 100 || 
          Math.abs(result.translateY - previous.translateY) > 100) {
        runOnJS(setPositionKey)(prev => prev + 1);
      }
    },
    []
  );
  
  // Clear cache when nodes change significantly
  React.useEffect(() => {
    if (nodes.length > UI_CONFIG.CACHE_CLEAR_THRESHOLD) {
      nodeDimensionsCache.current.clear();
    }
  }, [nodes.length]);
  
  // Error boundary wrapper for connection rendering
  const renderConnection = React.useCallback((connection: Connection, index: number) => {
    try {
      const sourceNode = nodes.find(n => n.id === connection.sourceId);
      const targetNode = nodes.find(n => n.id === connection.targetId);
      
      if (!sourceNode || !targetNode) {
        console.warn(`[MindMapScreen] Missing nodes for connection ${connection.id}`);
        return null;
      }
      
      return (
        <View key={`wrapper-${connection.id}`} style={{ 
          zIndex: (selectedConnectionId === connection.id) ? 150 : (50 + index),
          pointerEvents: 'box-none'
        }}>
          <CurvedConnection
            connection={connection}
            sourceNode={sourceNode}
            targetNode={targetNode}
            getNodeDimensions={getNodeDimensions}
            screenWidth={safeWidth}
            screenHeight={safeHeight}
            translateX={translateX}
            translateY={translateY}
            canvasCenter={CANVAS_CENTER}
            onConnectionPress={() => handleConnectionSelect(connection.id)}
            isSelected={selectedConnectionId === connection.id}
          />
        </View>
      );
    } catch (error) {
      console.error(`[MindMapScreen] Error rendering connection ${connection.id}:`, error);
      return null;
    }
  }, [nodes, selectedConnectionId, safeWidth, safeHeight, translateX, translateY, CANVAS_CENTER, handleConnectionSelect]);
  
  // Simple function to get node dimensions (no caching for now)
  const getNodeDimensions = React.useCallback((title: string) => {
    try {
      return calculateNodeSize(title);
    } catch (error) {
      console.warn('[MindMapScreen] Error calculating node dimensions:', error);
      return { width: 120, height: 65 }; // Fallback dimensions
    }
  }, []);
  
  // Memoized handlers with stable references
  const getDeleteHandler = React.useCallback((nodeId: string) => () => handleNodeDelete(nodeId), [handleNodeDelete]);
  const getConnectionClickHandler = React.useCallback((nodeId: string) => () => handleConnectionClick(nodeId), [handleConnectionClick]);
  
  // Simple virtualization - render only nodes within viewport
  const visibleNodes = React.useMemo(() => {
    // For now, disable virtualization to ensure all nodes are visible
    return nodes;
  }, [nodes]);
  
  // Simplified gesture - only pan for now to ensure basic functionality
  const combinedGesture = React.useMemo(() => {
    return backgroundPanGesture;
  }, [backgroundPanGesture]);

  
// Custom error handler for mind map specific errors
  const handleMindMapError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('[MindMapScreen] Error caught by boundary:', error);
    console.error('[MindMapScreen] Component stack:', errorInfo.componentStack);
    
    // Attempt to recover by resetting to default state
    if (error.message.includes('NaN') || error.message.includes('Infinity')) {
      console.log('[MindMapScreen] Attempting recovery from coordinate error...');
      // The error boundary will handle the reset
    }
  }, []);
  
  // Remove direct access to .value during rendering to avoid Reanimated warnings
  console.log('[MindMapScreen] Rendering with nodes:', nodes.length, 'connections:', connections.length);
  console.log('[MindMapScreen] First node data:', nodes[0]);
  console.log('[MindMapScreen] Canvas center:', CANVAS_CENTER);
  
  return (
    <ErrorBoundary 
      onError={handleMindMapError}
      showDevDetails={true}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Zoomable container for grid, connections, and nodes */}
        <GestureDetector gesture={combinedGesture} key="main-gesture-detector">
        <View 
          style={[
            styles.zoomContainer,
            { transform: [{ scale: zoomLevel }] }
          ]}
        >
        {/* Grid background - simplified, no gesture detector wrapping */}
        <GridBackground 
          translateX={translateX}
          translateY={translateY}
        />
        
        {/* Connections Layer - with error boundaries */}
        {connections.map((connection, index) => renderConnection(connection, index))}

          
        {/* Drawing Canvas Layer */}
        <DrawingCanvas
          isActive={activeTool === 'pencil'}
          screenWidth={safeWidth}
          screenHeight={safeHeight}
          translateX={translateX}
          translateY={translateY}
          canvasCenter={CANVAS_CENTER}
        />

        {/* Node rendering with error boundary and performance optimization */}
        {useMemo(() => {
          try {
            // Note: Can't log node count here due to Reanimated restrictions
            
            return visibleNodes.map((node) => {
              try {
                // Validate node data
                if (!node || !node.id) {
                  console.warn('[MindMapScreen] Invalid node data:', node);
                  return null;
                }
                
                // Note: Can't log node details here due to Reanimated restrictions when accessing animated values
                
                // Use relative coordinates directly (same as web system)
                const nodeX = typeof node.x === 'number' && !isNaN(node.x) ? node.x : 0;
                const nodeY = typeof node.y === 'number' && !isNaN(node.y) ? node.y : 0;
                
                // Calculate screen position using the same formula as web
                const nodeDimensions = getNodeDimensions(node.title);
                const screenX = safeWidth / 2 + nodeX - nodeDimensions.width / 2 - translateX.value + CANVAS_CENTER;
                const screenY = safeHeight / 2 + nodeY - nodeDimensions.height / 2 - translateY.value + CANVAS_CENTER;
                
                // Note: We can't log translateX.value and translateY.value here due to Reanimated restrictions
                
                // Validate screen coordinates
                if (!isFinite(screenX) || !isFinite(screenY) || 
                    Math.abs(screenX) > 100000 || Math.abs(screenY) > 100000) {
                  console.warn(`[MindMapScreen] Invalid screen coordinates for node ${node.id}:`, { screenX, screenY, nodeX, nodeY });
                  return null;
                }
                
                return (
                  <MindMapNode 
                    key={`${node.id}-${positionKey}`}
                    nodeId={node.id}
                    title={node.title || 'Node'}
                    color={node.color}
                    borderColor={node.borderColor}
                    width={nodeDimensions.width}
                    height={nodeDimensions.height}
                    x={screenX}
                    y={screenY}
                    translateX={translateX}
                    translateY={translateY}
                    screenWidth={safeWidth}
                    screenHeight={safeHeight}
                    onPositionChange={(newScreenX, newScreenY) => {
                      try {
                        // Validate input coordinates
                        if (typeof newScreenX !== 'number' || typeof newScreenY !== 'number' || 
                            isNaN(newScreenX) || isNaN(newScreenY) || !isFinite(newScreenX) || !isFinite(newScreenY)) {
                          console.warn('[MindMapScreen] Invalid position change:', { newScreenX, newScreenY });
                          return;
                        }
                        
                        // Convert from screen coordinates back to relative coordinates (same as web)
                        const nodeDimensions = getNodeDimensions(node.title);
                        const relativeX = newScreenX - safeWidth / 2 + nodeDimensions.width / 2 + translateX.value - CANVAS_CENTER;
                        const relativeY = newScreenY - safeHeight / 2 + nodeDimensions.height / 2 + translateY.value - CANVAS_CENTER;
                        
                        // Validate relative coordinates
                        if (Math.abs(relativeX) > 50000 || Math.abs(relativeY) > 50000) {
                          console.warn('[MindMapScreen] Position change too large:', { relativeX, relativeY });
                          return;
                        }
                        
                        handleNodePositionChange(node.id, relativeX, relativeY);
                      } catch (error) {
                        console.warn('[MindMapScreen] Error in position change:', error);
                      }
                    }}
                    onDragStateChange={handleNodeDragStateChange}
                    onLivePositionUpdate={handleNodeLivePositionUpdate}
                    onTitleChange={handleTitleChange}
                    onEditStateChange={handleEditStateChange}
                    isEditingFromParent={currentEditingNodeId === node.id}
                    onDelete={getDeleteHandler(node.id)}
                    onConnectionClick={getConnectionClickHandler(node.id)}
                    isConnectionSource={connectionSourceNodeId === node.id && activeTool === 'select'}
                  />
                );
              } catch (error) {
                console.error(`[MindMapScreen] Error rendering node ${node?.id}:`, error);
                return null;
              }
            });
          } catch (error) {
            console.error('[MindMapScreen] Error in node rendering:', error);
            return null;
          }
        }, [visibleNodes, positionKey, currentEditingNodeId, connectionSourceNodeId, activeTool, translateX, translateY, safeWidth, safeHeight, handleNodeDragStateChange, handleNodeLivePositionUpdate, handleTitleChange, handleEditStateChange, getDeleteHandler, getConnectionClickHandler, handleNodePositionChange, CANVAS_CENTER])}
        </View>
      </GestureDetector>
      
      {/* Adobe-style Toolbar - moved higher */}
      <ToolBar activeTool={activeTool} onToolChange={handleToolChange} />
      
      {/* Removed Zoom Mode Toast */}
      
      {/* Debug Panel Modal */}
      <DebugPanel
        visible={debugPanelVisible}
        onClose={() => setDebugPanelVisible(false)}
        debugCoords={debugCoords}
        activeTool={activeTool}
        zoomFactor={zoomLevel}
        mindMapStats={{
          nodesCount: nodes.length,
          connectionsCount: connections.length,
          sessionStartTime: sessionStartTime,
        }}
        baseNodeWidth={baseNodeWidth}
        baseNodeHeight={baseNodeHeight}
        gridSize={getFixedGridSize('mobile')}
        fontSize={fontSize}
        onResetView={handleResetView}
        onClearCache={handleClearCache}
      />

      <View style={styles.floatingNavigation}>
        <TouchableOpacity 
          style={[styles.floatingButton, { backgroundColor: '#374151' }]} 
          onPress={onBackToChat}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.floatingButtonText}>←</Text>
        </TouchableOpacity>
        
        {/* Debug/Settings Button */}
        <TouchableOpacity 
          style={[styles.floatingButton, { backgroundColor: debugPanelVisible ? '#3b82f6' : '#374151' }]} 
          onPress={toggleDebugPanel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.floatingButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controlsContainer}>
        
        {/* Add new node button */}
        <TouchableOpacity 
          style={[styles.controlButton, { backgroundColor: '#3b82f6', marginBottom: 4 }]} 
          onPress={() => {
            const newNode = {
              id: `node-${Date.now()}`,
              title: 'Nuovo Nodo',
              x: Math.random() * 400 - 200, // Random position between -200 and 200
              y: Math.random() * 400 - 200,
              color: '#6b7280'
            };
            setNodes(prev => [...prev, newNode]);
          }}
        >
          <Text style={styles.controlButtonText}>+ Nodo</Text>
        </TouchableOpacity>
        
        {/* Delete connection button (only shown when connection is selected) */}
        {selectedConnectionId && (
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: '#ef4444', marginBottom: 4 }]} 
            onPress={handleSelectedConnectionDelete}
          >
            <Text style={styles.controlButtonText}>🗑️ Conn</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={[styles.controlButton, { backgroundColor: '#10b981' }]} onPress={exportMindMap}>
          <Text style={styles.controlButtonText}>Export</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            { backgroundColor: isZoomEnabled ? '#f59e0b' : '#6b7280' }
          ]} 
          onPress={toggleZoom}
        >
          <Text style={styles.controlButtonText}>
            {isZoomEnabled ? '75%' : '100%'}
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  zoomContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
    debugTable: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
    minWidth: 150,
  },
  debugTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 2,
  },
  floatingNavigation: {
    position: 'absolute',
    top: 50,
    left: 10,
    flexDirection: 'column',
    gap: 8,
    zIndex: 1000,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    top: 50,
    right: 10,
    flexDirection: 'column',
    gap: 8,
    zIndex: 1000,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});