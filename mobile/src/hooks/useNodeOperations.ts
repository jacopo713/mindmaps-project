/**
 * useNodeOperations Hook
 * 
 * Handles all node-related operations including creation, editing, positioning,
 * and deletion. Provides a comprehensive API for node management.
 * 
 * @author Code Cleanup Specialist
 * @version 2.0.0
 */
import { useCallback } from 'react';
import { MindMapNode as MindMapNodeType, Connection } from '../types';
import { calculateNodeSize, getDefaultNodeSize } from '../utils/nodeSize';

/**
 * Hook interface for node operations
 */
interface UseNodeOperationsProps {
  /** Array of nodes */
  nodes: MindMapNodeType[];
  /** Function to set nodes */
  setNodes: React.Dispatch<React.SetStateAction<MindMapNodeType[]>>;
  /** ID of currently editing node */
  currentEditingNodeId: string | null;
  /** ID of connection source node */
  connectionSourceNodeId: string | null;
  /** Function to set connection source node ID */
  setConnectionSourceNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  /** Function to set selected connection ID */
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  /** Function to set current editing node ID */
  setCurrentEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  /** Function to set connections */
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
}

/**
 * Hook return interface
 */
interface UseNodeOperationsReturn {
  /** Handles node position changes */
  handleNodePositionChange: (nodeId: string, newX: number, newY: number) => void;
  /** Handles node title changes */
  handleTitleChange: (nodeId: string, newTitle: string) => void;
  /** Handles node edit state changes */
  handleEditStateChange: (nodeId: string, isEditing: boolean) => void;
  /** Handles node deletion */
  handleNodeDelete: (nodeId: string) => void;
  /** Creates a new node */
  createNewNodeMobile: (x: number, y: number) => void;
}

/**
 * Custom hook for managing node operations
 * 
 * @param props - Configuration props for node operations
 * @returns Object containing node operation functions
 */
export function useNodeOperations(props: UseNodeOperationsProps): UseNodeOperationsReturn {
  const {
    nodes,
    setNodes,
    currentEditingNodeId,
    connectionSourceNodeId,
    setConnectionSourceNodeId,
    setSelectedConnectionId,
    setCurrentEditingNodeId,
    setConnections
  } = props;

  /**
   * Handles changes to node position with validation
   */
  const handleNodePositionChange = useCallback((nodeId: string, newX: number, newY: number) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId 
          ? { 
              ...node, 
              x: isNaN(newX) ? node.x : newX, 
              y: isNaN(newY) ? node.y : newY 
            }
          : node
      )
    );
  }, [setNodes]);

  /**
   * Handles changes to node title with validation
   */
  const handleTitleChange = useCallback((nodeId: string, newTitle: string) => {
    if (!newTitle || newTitle.trim() === '') return;
    
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId 
          ? { 
              ...node, 
              title: newTitle.trim(),
              ...calculateNodeSize(newTitle.trim())
            }
          : node
      )
    );
  }, [setNodes]);

  /**
   * Handles changes to node edit state
   */
  const handleEditStateChange = useCallback((nodeId: string, isEditing: boolean) => {
    if (isEditing) {
      setCurrentEditingNodeId(nodeId);
      setConnectionSourceNodeId(null);
      setSelectedConnectionId(null);
    } else {
      setCurrentEditingNodeId(null);
    }
  }, [setCurrentEditingNodeId, setConnectionSourceNodeId, setSelectedConnectionId]);

  /**
   * Handles node deletion with cleanup of related connections
   */
  const handleNodeDelete = useCallback((nodeId: string) => {
    // Remove the node
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    
    // Remove all connections related to this node
    setConnections(prevConnections => 
      prevConnections.filter(
        connection => connection.sourceId !== nodeId && connection.targetId !== nodeId
      )
    );
    
    // Clear editing state if deleting the currently edited node
    if (currentEditingNodeId === nodeId) {
      setCurrentEditingNodeId(null);
    }
    
    // Clear connection source if deleting the source node
    if (connectionSourceNodeId === nodeId) {
      setConnectionSourceNodeId(null);
    }
  }, [
    setNodes, 
    setConnections, 
    currentEditingNodeId, 
    setCurrentEditingNodeId, 
    connectionSourceNodeId, 
    setConnectionSourceNodeId
  ]);

  /**
   * Creates a new node at the specified position
   */
  const createNewNodeMobile = useCallback((x: number, y: number) => {
    const defaultSize = getDefaultNodeSize();
    const newNode: MindMapNodeType = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Nuovo Nodo',
      x: isNaN(x) ? 0 : x,
      y: isNaN(y) ? 0 : y,
      color: '#6b7280'
    };
    
    setNodes(prevNodes => [...prevNodes, newNode]);
    setCurrentEditingNodeId(newNode.id);
    setConnectionSourceNodeId(null);
    setSelectedConnectionId(null);
  }, [
    setNodes, 
    setCurrentEditingNodeId, 
    setConnectionSourceNodeId, 
    setSelectedConnectionId
  ]);

  return {
    handleNodePositionChange,
    handleTitleChange,
    handleEditStateChange,
    handleNodeDelete,
    createNewNodeMobile
  };
}