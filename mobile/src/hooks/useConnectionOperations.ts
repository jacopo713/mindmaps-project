/**
 * useConnectionOperations Hook
 * 
 * Handles all connection-related operations including creation, selection,
 * deletion, and management of connection timeouts.
 * 
 * @author Code Cleanup Specialist
 * @version 2.0.0
 */
import { useCallback, useRef } from 'react';
import { Connection } from '../types';

/**
 * Hook interface for connection operations
 */
interface UseConnectionOperationsProps {
  /** Array of connections */
  connections: Connection[];
  /** Function to set connections */
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  /** ID of connection source node */
  connectionSourceNodeId: string | null;
  /** Function to set connection source node ID */
  setConnectionSourceNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  /** ID of selected connection */
  selectedConnectionId: string | null;
  /** Function to set selected connection ID */
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
  /** ID of currently editing node */
  currentEditingNodeId: string | null;
  /** Function to set current editing node ID */
  setCurrentEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Hook return interface
 */
interface UseConnectionOperationsReturn {
  /** Creates a new connection between nodes */
  createConnection: (sourceNodeId: string, targetNodeId: string) => void;
  /** Handles connection click events */
  handleConnectionClick: (connectionId: string) => void;
  /** Handles connection deletion */
  handleConnectionDelete: (connectionId: string) => void;
  /** Handles connection selection */
  handleConnectionSelect: (connectionId: string) => void;
  /** Handles deletion of selected connection */
  handleSelectedConnectionDelete: () => void;
  /** Reference for connection timeout */
  connectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

/**
 * Custom hook for managing connection operations
 * 
 * @param props - Configuration props for connection operations
 * @returns Object containing connection operation functions
 */
export function useConnectionOperations(props: UseConnectionOperationsProps): UseConnectionOperationsReturn {
  const {
    connections,
    setConnections,
    connectionSourceNodeId,
    setConnectionSourceNodeId,
    selectedConnectionId,
    setSelectedConnectionId,
    currentEditingNodeId,
    setCurrentEditingNodeId
  } = props;

  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Creates a new connection between source and target nodes
   */
  const createConnection = useCallback((sourceNodeId: string, targetNodeId: string) => {
    if (sourceNodeId === targetNodeId) {
      console.warn('Cannot create connection between same node');
      return;
    }

    // Check if connection already exists
    const connectionExists = connections.some(
      conn => 
        (conn.sourceId === sourceNodeId && conn.targetId === targetNodeId) ||
        (conn.sourceId === targetNodeId && conn.targetId === sourceNodeId)
    );

    if (connectionExists) {
      console.warn('Connection already exists between these nodes');
      return;
    }

    const newConnection: Connection = {
      id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceId: sourceNodeId,
      targetId: targetNodeId,
      type: 'curved',
      curvature: 0.3,
      color: '#6b7280',
      width: 2,
      showArrow: true,
      arrowPosition: 'end'
    };

    setConnections(prev => [...prev, newConnection]);
    setConnectionSourceNodeId(null);
    
    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
  }, [
    connections,
    setConnections,
    setConnectionSourceNodeId
  ]);

  /**
   * Handles connection click events with selection logic
   */
  const handleConnectionClick = useCallback((connectionId: string) => {
    // Clear connection creation mode
    setConnectionSourceNodeId(null);
    
    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    if (selectedConnectionId === connectionId) {
      // Deselect if clicking the same connection
      setSelectedConnectionId(null);
    } else {
      // Select the clicked connection
      setSelectedConnectionId(connectionId);
      
      // Clear node editing state
      setCurrentEditingNodeId(null);
      
      // Set timeout to auto-deselect connection
      connectionTimeoutRef.current = setTimeout(() => {
        setSelectedConnectionId(null);
      }, 3000);
    }
  }, [
    selectedConnectionId,
    setSelectedConnectionId,
    setConnectionSourceNodeId,
    setCurrentEditingNodeId
  ]);

  /**
   * Handles connection deletion
   */
  const handleConnectionDelete = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    
    // Clear selection if deleting the selected connection
    if (selectedConnectionId === connectionId) {
      setSelectedConnectionId(null);
    }
    
    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
  }, [
    setConnections,
    selectedConnectionId,
    setSelectedConnectionId
  ]);

  /**
   * Handles connection selection
   */
  const handleConnectionSelect = useCallback((connectionId: string) => {
    handleConnectionClick(connectionId);
  }, [handleConnectionClick]);

  /**
   * Handles deletion of the currently selected connection
   */
  const handleSelectedConnectionDelete = useCallback(() => {
    if (selectedConnectionId) {
      handleConnectionDelete(selectedConnectionId);
    }
  }, [selectedConnectionId, handleConnectionDelete]);

  return {
    createConnection,
    handleConnectionClick,
    handleConnectionDelete,
    handleConnectionSelect,
    handleSelectedConnectionDelete,
    connectionTimeoutRef
  };
}