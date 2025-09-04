/**
 * useMindMapState Hook
 * 
 * Manages the core state of the mind map application.
 * Handles nodes, connections, editing state, and UI state.
 * 
 * @author Code Cleanup Specialist
 * @version 2.0.0
 */
import { useState, useRef, useEffect } from 'react';
import { MindMapNode as MindMapNodeType, Connection, ToolType } from '../types';
import { StorageManager } from '../utils/storage';

/**
 * Hook interface for mind map state management
 */
interface UseMindMapStateReturn {
  // Node state
  nodes: MindMapNodeType[];
  setNodes: React.Dispatch<React.SetStateAction<MindMapNodeType[]>>;
  
  // Connection state
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  
  // Editing state
  currentEditingNodeId: string | null;
  setCurrentEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Connection creation state
  connectionSourceNodeId: string | null;
  setConnectionSourceNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Connection selection state
  selectedConnectionId: string | null;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Mind map identification
  currentMindMapId: string;
  setCurrentMindMapId: React.Dispatch<React.SetStateAction<string>>;
  
  // Tool state
  activeTool: ToolType;
  setActiveTool: React.Dispatch<React.SetStateAction<ToolType>>;
  
  // Zoom state
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  isZoomEnabled: boolean;
  setIsZoomEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  
  // UI state
  debugPanelVisible: boolean;
  setDebugPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Session tracking
  sessionStartTime: number;
  
  // Refs
  connectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

/**
 * Custom hook for managing mind map application state
 * 
 * @returns Object containing state variables and setters for mind map management
 */
export function useMindMapState(): UseMindMapStateReturn {
  // Node state
  const [nodes, setNodes] = useState<MindMapNodeType[]>([]);
  const [currentEditingNodeId, setCurrentEditingNodeId] = useState<string | null>(null);
  
  // Connection state
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionSourceNodeId, setConnectionSourceNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  
  // Mind map identification
  const [currentMindMapId, setCurrentMindMapId] = useState<string>('default-mindmap');
  
  // Tool state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isZoomEnabled, setIsZoomEnabled] = useState<boolean>(true);
  
  // UI state
  const [debugPanelVisible, setDebugPanelVisible] = useState<boolean>(false);
  
  // Session tracking
  const [sessionStartTime] = useState<number>(Date.now());
  
  // Refs
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simple temporary mind map - no storage persistence
  useEffect(() => {
    console.log('[useMindMapState] Creating temporary mind map...');
    
    // Create simple default nodes
    const defaultNodes = [
      {
        id: 'node-central',
        title: 'Idea Centrale',
        x: 0,
        y: 0,
        color: '#3b82f6',
        borderColor: '#1d4ed8'
      },
      {
        id: 'node-1',
        title: 'Argomento 1',
        x: -200,
        y: -100,
        color: '#10b981',
        borderColor: '#047857'
      },
      {
        id: 'node-2',
        title: 'Argomento 2',
        x: 200,
        y: -100,
        color: '#10b981',
        borderColor: '#047857'
      }
    ];
    
    const defaultConnections = [
      {
        id: 'conn-1',
        sourceId: 'node-central',
        targetId: 'node-1',
        type: 'curved' as const,
        curvature: 0.3,
        color: '#6b7280'
      },
      {
        id: 'conn-2',
        sourceId: 'node-central',
        targetId: 'node-2',
        type: 'curved' as const,
        curvature: 0.3,
        color: '#6b7280'
      }
    ];
    
    setNodes(defaultNodes);
    setConnections(defaultConnections);
    
    console.log('[useMindMapState] Temporary mind map created with', defaultNodes.length, 'nodes');
  }, []); // Empty dependency array - runs only once on mount

  // No auto-save for temporary mind map - removed storage persistence

  // Cleanup connection timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Node state
    nodes,
    setNodes,
    
    // Connection state
    connections,
    setConnections,
    
    // Editing state
    currentEditingNodeId,
    setCurrentEditingNodeId,
    
    // Connection creation state
    connectionSourceNodeId,
    setConnectionSourceNodeId,
    
    // Connection selection state
    selectedConnectionId,
    setSelectedConnectionId,
    
    // Mind map identification
    currentMindMapId,
    setCurrentMindMapId,
    
    // Tool state
    activeTool,
    setActiveTool,
    
    // Zoom state
    zoomLevel,
    setZoomLevel,
    isZoomEnabled,
    setIsZoomEnabled,
    
    // UI state
    debugPanelVisible,
    setDebugPanelVisible,
    
    // Session tracking
    sessionStartTime,
    
    // Refs
    connectionTimeoutRef
  };
}