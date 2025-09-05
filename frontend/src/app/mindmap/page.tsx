'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import MindMapNode from '../../components/MindMapNode';
import CurvedConnection from '../../components/CurvedConnection';
import ToolBar, { ToolType } from '../../components/ToolBar';
import DrawingCanvas from '../../components/DrawingCanvas';
import { StorageManager } from '../../utils/storage';
import { MindMapNode as MindMapNodeType, Connection } from '../../types';
import { 
  getFixedGridSize,
  type ScreenDimensions
} from '../../utils/scaling-utils';
import { applyJsonPatch, type JsonPatchOp } from '../../utils/jsonPatch';
import { calculateNodeSize, getDefaultNodeSize } from '../../utils/nodeSize';
import { auth } from '../../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { MindMapsRepo } from '../../utils/firestoreRepo';

const CANVAS_SIZE = 5000; // Large canvas size for infinite scrolling
const CANVAS_CENTER = CANVAS_SIZE / 2;

interface GridBackgroundProps {
  offsetX: number;
  offsetY: number;
  viewWidth: number;
  viewHeight: number;
}

function GridBackground({ offsetX, offsetY, viewWidth, viewHeight }: GridBackgroundProps) {
  const gridSize = getFixedGridSize('web');
  
  // Calculate visible grid lines with buffer
  const startX = Math.floor(offsetX / gridSize) * gridSize - gridSize;
  const startY = Math.floor(offsetY / gridSize) * gridSize - gridSize;
  const endX = startX + viewWidth + gridSize * 3;
  const endY = startY + viewHeight + gridSize * 3;
  
  const verticalLines = [];
  const horizontalLines = [];
  
  // Generate vertical lines
  for (let x = startX; x <= endX; x += gridSize) {
    verticalLines.push(
      <div
        key={`v-${x}`}
        className="absolute top-0 h-full w-px bg-gray-200"
        style={{ left: x - offsetX }}
      />
    );
  }
  
  // Generate horizontal lines
  for (let y = startY; y <= endY; y += gridSize) {
    horizontalLines.push(
      <div
        key={`h-${y}`}
        className="absolute left-0 w-full h-px bg-gray-200"
        style={{ top: y - offsetY }}
      />
    );
  }
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {verticalLines}
      {horizontalLines}
    </div>
  );
}

// Use the type from types file

export default function MindMapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const historyRef = useRef<Array<{ nodes: MindMapNodeType[]; connections: Connection[] }>>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const nodeDragActiveRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [inChatContext, setInChatContext] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      setAuthReady(true);
      if (!u) {
        router.replace('/login');
      }
    });
    return () => unsub();
  }, [router]);
  const [dimensions, setDimensions] = useState<ScreenDimensions>({ width: 0, height: 0 });
  const [offset, setOffset] = useState({ x: CANVAS_CENTER, y: CANVAS_CENTER });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickPos, setLastClickPos] = useState({ x: 0, y: 0 });
  
  // Restored editing coordination state (without visual effects)
  const [currentEditingNodeId, setCurrentEditingNodeId] = useState<string | null>(null);
  
  // Global state for connection mode
  const [connectionSourceNodeId, setConnectionSourceNodeId] = useState<string | null>(null);
  const [isConnectionMode, setIsConnectionMode] = useState<boolean>(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Connection selection state
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Prevent selection after connection creation
  const [preventNextSelection, setPreventNextSelection] = useState<boolean>(false);
  
  // Drag connection states
  const [isConnectionDragging, setIsConnectionDragging] = useState<boolean>(false);
  const [connectionDragPosition, setConnectionDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [connectionDragStartNode, setConnectionDragStartNode] = useState<{ id: string; x: number; y: number } | null>(null);
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);
  
  // Base node dimensions (will be calculated dynamically per node)
  const { width: baseNodeWidth, height: baseNodeHeight } = getDefaultNodeSize();
  const fontSize = 15;
  const [nodes, setNodes] = useState<MindMapNodeType[]>([
    { 
      id: '1', 
      title: 'Idea Centrale', 
      x: 0, 
      y: 0,
      borderColor: '#4f46e5'
    },
    {
      id: '2',
      title: 'Strategia Marketing',
      x: -250,
      y: -150,
      borderColor: '#f59e0b'
    },
    {
      id: '3',
      title: 'Sviluppo Prodotto',
      x: 250,
      y: -150,
      borderColor: '#10b981'
    },
    {
      id: '4',
      title: 'Analisi Mercato',
      x: -250,
      y: 150,
      borderColor: '#ef4444'
    },
    {
      id: '5',
      title: 'Team Building',
      x: 250,
      y: 150,
      borderColor: '#8b5cf6'
    },
    {
      id: '6',
      title: 'Finanze',
      x: 0,
      y: -250,
      borderColor: '#22c55e'
    },
    {
      id: '7',
      title: 'Partnership',
      x: 0,
      y: 250,
      borderColor: '#f97316'
    }
  ]);
  
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: 'conn-1-2',
      sourceId: '1',
      targetId: '2',
      type: 'curved',
      adaptiveCurvature: true,
      curvatureDirection: 'auto',
      color: '#6b7280',
      width: 2,
      showArrow: true,
      arrowPosition: 'end',
      relation: 'generico'
    },
    {
      id: 'conn-1-3',
      sourceId: '1',
      targetId: '3',
      type: 'curved',
      adaptiveCurvature: true,
      curvatureDirection: 'auto',
      color: '#6b7280',
      width: 2,
      showArrow: true,
      arrowPosition: 'end',
      relation: 'generico'
    },
    {
      id: 'conn-1-4',
      sourceId: '1',
      targetId: '4',
      type: 'curved',
      adaptiveCurvature: true,
      curvatureDirection: 'auto',
      color: '#6b7280',
      width: 2,
      showArrow: true,
      arrowPosition: 'end',
      relation: 'generico'
    },
    {
      id: 'conn-1-5',
      sourceId: '1',
      targetId: '5',
      type: 'curved',
      adaptiveCurvature: true,
      curvatureDirection: 'auto',
      color: '#6b7280',
      width: 2,
      showArrow: true,
      arrowPosition: 'end',
      relation: 'generico'
    },
    {
      id: 'conn-1-6',
      sourceId: '1',
      targetId: '6',
      type: 'curved',
      adaptiveCurvature: true,
      curvatureDirection: 'auto',
      color: '#6b7280',
      width: 2,
      showArrow: true,
      arrowPosition: 'end',
      relation: 'generico'
    },
    {
      id: 'conn-1-7',
      sourceId: '1',
      targetId: '7',
      type: 'curved',
      adaptiveCurvature: true,
      curvatureDirection: 'auto',
      color: '#6b7280',
      width: 2,
      showArrow: true,
      arrowPosition: 'end',
      relation: 'generico'
    }
  ]);
  
  const [currentMindMapId, setCurrentMindMapId] = useState<string>('temp');
  const [debugCoords, setDebugCoords] = useState({
    nodeX: 0,
    nodeY: 0,
    liveNodeX: 0,
    liveNodeY: 0,
    offsetX: CANVAS_CENTER,
    offsetY: CANVAS_CENTER,
    screenX: 0,
    screenY: 0,
    isDragging: false,
    isNodeDragging: false
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load map by id from URL when present
  useEffect(() => {
    if (!authReady || !currentUser) return;
    const id = searchParams.get('id');
    if (!id) {
      setMapLoaded(true);
      return;
    }
    MindMapsRepo.get(currentUser.uid, id)
      .then((map) => {
        if (map) {
          setCurrentMindMapId(map.id);
          setNodes(map.nodes || []);
          setConnections(map.connections || []);
          historyRef.current = [];
          setHistoryCount(0);
          setIsDirty(false);
        }
      })
      .finally(() => setMapLoaded(true));
  }, [authReady, currentUser, searchParams]);

  // Keep local toggle state in sync with storage when map id changes
  useEffect(() => {
    setInChatContext(StorageManager.hasContextMap(currentMindMapId));
  }, [currentMindMapId]);

  useEffect(() => {
    const updateDimensions = () => {
      const newDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setDimensions(newDimensions);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Update debug coordinates when offset or nodes change
  useEffect(() => {
    const firstNode = nodes[0];
    if (firstNode) {
      const nodeDimensions = calculateNodeSize(firstNode.title);
      const screenX = dimensions.width / 2 + firstNode.x - nodeDimensions.width / 2 - offset.x + CANVAS_CENTER;
      const screenY = dimensions.height / 2 + firstNode.y - nodeDimensions.height / 2 - offset.y + CANVAS_CENTER;
      
      setDebugCoords(prev => ({
        ...prev,
        nodeX: Math.round(firstNode.x),
        nodeY: Math.round(firstNode.y),
        offsetX: Math.round(offset.x),
        offsetY: Math.round(offset.y),
        screenX: Math.round(screenX),
        screenY: Math.round(screenY),
        isDragging: isDragging
      }));
    }
  }, [offset, nodes, dimensions, isDragging]);

  const createNewNode = useCallback((x: number, y: number) => {
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections))
    });
    setHistoryCount(historyRef.current.length);
    const relativeX = x - dimensions.width / 2 + offset.x - CANVAS_CENTER;
    const relativeY = y - dimensions.height / 2 + offset.y - CANVAS_CENTER;
    
    const newNode: MindMapNodeType = {
      id: Date.now().toString(),
      title: 'Nuovo Nodo',
      x: relativeX,
      y: relativeY
    };
    
    setNodes(prevNodes => [...prevNodes, newNode]);
    setIsDirty(true);
  }, [dimensions, offset, nodes, connections]);


  const handleNodePositionChange = useCallback((nodeId: string, newX: number, newY: number) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId ? { ...node, x: newX, y: newY } : node
      )
    );
  }, []);

  const handleNodeDragStateChange = useCallback((isDragging: boolean) => {
    if (isDragging && !nodeDragActiveRef.current) {
      historyRef.current.push({
        nodes: JSON.parse(JSON.stringify(nodes)),
        connections: JSON.parse(JSON.stringify(connections))
      });
      setHistoryCount(historyRef.current.length);
      setIsDirty(true);
    }
    nodeDragActiveRef.current = isDragging;
    setDebugCoords(prev => ({
      ...prev,
      isNodeDragging: isDragging
    }));
  }, [nodes, connections]);

  const handleLivePositionUpdate = useCallback((liveX: number, liveY: number) => {
    setDebugCoords(prev => ({
      ...prev,
      liveNodeX: Math.round(liveX),
      liveNodeY: Math.round(liveY)
    }));
  }, []);

  const handleTitleChange = useCallback((nodeId: string, newTitle: string) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId ? { ...node, title: newTitle } : node
      )
    );
    setIsDirty(true);

    // Removed AI title suggestion on '?' to keep only normal chat
  }, [nodes, connections]);

  const handleEditStateChange = useCallback((nodeId: string, isEditing: boolean) => {
    if (isEditing) {
      historyRef.current.push({
        nodes: JSON.parse(JSON.stringify(nodes)),
        connections: JSON.parse(JSON.stringify(connections))
      });
      setHistoryCount(historyRef.current.length);
    }
    setCurrentEditingNodeId(isEditing ? nodeId : null);
  }, [nodes, connections]);

  const createConnection = useCallback((sourceId: string, targetId: string) => {
    // Validation checks
    if (sourceId === targetId) {
      return; // No self-connections
    }
    
    // Check if connection already exists (in either direction)
    const connectionExists = connections.some(conn => 
      (conn.sourceId === sourceId && conn.targetId === targetId) ||
      (conn.sourceId === targetId && conn.targetId === sourceId)
    );
    
    if (connectionExists) {
      return; // No duplicate connections
    }
    
    // Snapshot
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections))
    });
    setHistoryCount(historyRef.current.length);
    // Create new connection
    const newConnection: Connection = {
      id: `conn-${sourceId}-${targetId}-${Date.now()}`,
      sourceId: sourceId,
      targetId: targetId,
      type: 'curved',
      adaptiveCurvature: true,
      curvatureDirection: 'auto',
      color: '#6b7280',
      width: 2,
      showArrow: true,
      arrowPosition: 'end',
      relation: 'generico'
    };
    
    setConnections(prevConnections => [...prevConnections, newConnection]);
    setIsDirty(true);
  }, [connections, nodes]);

  const handleConnectionClick = useCallback((nodeId: string, isCtrlClick: boolean) => {
    // First node selection: requires Ctrl+Click
    if (!connectionSourceNodeId) {
      if (!isCtrlClick) return; // Only Ctrl+Click for first node
      
      // Clear any existing timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      setConnectionSourceNodeId(nodeId);
      setIsConnectionMode(true);
      
      // Set 3-second timeout to clear connection mode
      connectionTimeoutRef.current = setTimeout(() => {
        setConnectionSourceNodeId(null);
        setIsConnectionMode(false);
        setPreventNextSelection(false);
        connectionTimeoutRef.current = null;
      }, 3000);
      
      return;
    }
    
    // Already in connection mode - second node selection
    if (connectionSourceNodeId === nodeId) {
      // Same node clicked again: cancel connection mode
      setConnectionSourceNodeId(null);
      setIsConnectionMode(false);
      setPreventNextSelection(false);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    } else {
      // Different node: create connection (no Ctrl needed for second node)
      createConnection(connectionSourceNodeId, nodeId);
      setConnectionSourceNodeId(null);
      setIsConnectionMode(false);
      setPreventNextSelection(true); // Prevent selection of target node
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
  }, [connectionSourceNodeId, createConnection]);

  const handleConnectionDragStart = useCallback((nodeId: string, mouseX: number, mouseY: number) => {
    // Clear any existing connection mode/timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // Find the node to get its position
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Calculate node's dynamic dimensions and screen position
    const nodeDimensions = calculateNodeSize(node.title);
    const nodeScreenX = dimensions.width / 2 + node.x - nodeDimensions.width / 2 - offset.x + CANVAS_CENTER;
    const nodeScreenY = dimensions.height / 2 + node.y - nodeDimensions.height / 2 - offset.y + CANVAS_CENTER;
    
    // Start drag connection mode
    setConnectionDragStartNode({ 
      id: nodeId, 
      x: nodeScreenX + nodeDimensions.width / 2, 
      y: nodeScreenY + nodeDimensions.height / 2 
    });
    setIsConnectionDragging(true);
    setConnectionDragPosition({ x: mouseX, y: mouseY });
    
    // Also set connection mode for visual feedback
    setConnectionSourceNodeId(nodeId);
    setIsConnectionMode(true);
  }, [nodes, dimensions, offset]);

  const handleConnectionDragEnd = useCallback((targetNodeId?: string) => {
    if (!connectionDragStartNode) return;
    
    if (targetNodeId && targetNodeId !== connectionDragStartNode.id) {
      // Create connection
      createConnection(connectionDragStartNode.id, targetNodeId);
    }
    
    // Clear all drag connection states
    setIsConnectionDragging(false);
    setConnectionDragPosition(null);
    setConnectionDragStartNode(null);
    setConnectionSourceNodeId(null);
    setIsConnectionMode(false);
    setPreventNextSelection(true); // Prevent selection after drag connection
  }, [connectionDragStartNode, createConnection]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections))
    });
    setHistoryCount(historyRef.current.length);
    // Remove the node
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    
    // Remove all connections associated with this node
    setConnections(prevConnections => 
      prevConnections.filter(connection => 
        connection.sourceId !== nodeId && connection.targetId !== nodeId
      )
    );
    
    // Clear editing state if the deleted node was being edited
    if (currentEditingNodeId === nodeId) {
      setCurrentEditingNodeId(null);
    }
    
    // Clear connection mode if deleted node was source
    if (connectionSourceNodeId === nodeId) {
      setConnectionSourceNodeId(null);
      setIsConnectionMode(false);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
    setIsDirty(true);
  }, [currentEditingNodeId, connectionSourceNodeId, nodes, connections]);
  
  

  const handleConnectionDelete = useCallback((connectionId: string) => {
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections))
    });
    setHistoryCount(historyRef.current.length);
    setConnections(prevConnections => 
      prevConnections.filter(connection => connection.id !== connectionId)
    );
    // Clear selection if deleted connection was selected
    if (selectedConnectionId === connectionId) {
      setSelectedConnectionId(null);
    }
    setIsDirty(true);
  }, [selectedConnectionId, nodes, connections]);

  const handleConnectionSelect = useCallback((connectionId: string) => {
    setSelectedConnectionId(selectedConnectionId === connectionId ? null : connectionId);
  }, [selectedConnectionId]);
  
  const handleNodeSelect = useCallback((nodeId: string) => {
    if (preventNextSelection) {
      setPreventNextSelection(false);
      return;
    }
    setSelectedNodeId(prev => (prev === nodeId ? null : nodeId));
  }, [preventNextSelection]);
  
  
  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    
    // Clear any active states when switching tools
    if (currentEditingNodeId) {
      setCurrentEditingNodeId(null);
    }
    if (isConnectionMode) {
      setConnectionSourceNodeId(null);
      setIsConnectionMode(false);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
    if (selectedConnectionId) {
      setSelectedConnectionId(null);
    }
    setPreventNextSelection(false);
  }, [currentEditingNodeId, isConnectionMode, selectedConnectionId, preventNextSelection]);



  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle connection dragging
    if (isConnectionDragging) {
      setConnectionDragPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Handle normal background dragging
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setOffset({
      x: dragStart.offsetX - deltaX,
      y: dragStart.offsetY - deltaY
    });
  }, [isDragging, dragStart, isConnectionDragging]);

  const handleMouseUp = useCallback(() => {
    // Handle connection drag end
    if (isConnectionDragging) {
      handleConnectionDragEnd();
      return;
    }
    
    // Handle normal drag end
    setIsDragging(false);
  }, [isConnectionDragging, handleConnectionDragEnd]);


  // Export mind map - directly from current state
  const exportMindMap = useCallback(() => {
    try {
      const mindMapData = {
        id: currentMindMapId,
        title: 'Test Mind Map',
        nodes: nodes,
        connections: connections,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const exportData = {
        version: '1.0',
        mindMap: mindMapData,
        exportedAt: Date.now(),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mindmap-${mindMapData.title.replace(/[^a-z0-9]/gi, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Mind Map esportata con successo!');
    } catch (error) {
      alert('Errore durante l\'esportazione: ' + (error as Error).message);
    }
  }, [currentMindMapId, nodes, connections]);

  // Import mind map
  const importMindMap = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    StorageManager.uploadMindMapJSON(file)
      .then((importedMindMap) => {
        setCurrentMindMapId(importedMindMap.id);
        setNodes(importedMindMap.nodes);
        setConnections(importedMindMap.connections || []);
        alert('Mind Map importata con successo!');
      })
      .catch((error) => {
        alert('Errore durante l\'importazione: ' + error.message);
      });
      
    // Reset file input
    event.target.value = '';
  }, []);

  // Persist current map to Firestore only when loaded and dirty
  useEffect(() => {
    if (!currentUser) return;
    if (!mapLoaded) return;
    if (!isDirty) return;
    const map = {
      id: currentMindMapId,
      title: 'Mind Map',
      nodes,
      connections,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any;
    MindMapsRepo.upsert(currentUser.uid, map).then((id) => {
      if (id && id !== currentMindMapId) {
        setCurrentMindMapId(id);
      }
      setIsDirty(false);
    }).catch(() => {});
  }, [currentUser, nodes, connections, mapLoaded, isDirty]);

  // Toolbar state (moved up to avoid reference errors)
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [isRelationMenuOpen, setIsRelationMenuOpen] = useState<boolean>(false);

  // AI Sidebar state (chat only)
  type AiMessage = { id: string; role: 'user' | 'assistant'; content: string; isStreaming?: boolean };
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiAbortRef = useRef<AbortController | null>(null);
  // AI Diff proposal state
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffPatch, setDiffPatch] = useState<JsonPatchOp[] | null>(null);
  const [diffSummary, setDiffSummary] = useState<string | null>(null);
  const [showDiffPanel, setShowDiffPanel] = useState(false);

  // Chat AI semplificata

  const sendAiMessage = useCallback(async (inputOverride?: string) => {
    const text = (inputOverride ?? aiInput).trim();
    if (!text || aiLoading) return;
    const userMsg: AiMessage = { id: Date.now().toString(), role: 'user', content: text };
    const assistantMsg: AiMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', isStreaming: true };
    setAiMessages(prev => [...prev, userMsg, assistantMsg]);
    if (!inputOverride) setAiInput('');
    setAiLoading(true);

    try {
      aiAbortRef.current = new AbortController();

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const context = {
        selectedNode: selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null,
        nodes: nodes.map(n => ({ id: n.id, title: n.title })),
        connections: connections.map(c => ({ sourceId: c.sourceId, targetId: c.targetId }))
      };
      const contextPrefix = `Contesto mappa (JSON)\n${JSON.stringify(context)}\n\n`;

      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...aiMessages, { role: 'user', content: contextPrefix + userMsg.content }].map(({ id: _id, isStreaming: _s, ...m }) => m)
        }),
        signal: aiAbortRef.current.signal
      });
      if (!res.ok) throw new Error('Network response was not ok');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let collected = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.trim());
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') {
              setAiMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, isStreaming: false } : m));
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                collected += parsed.content;
                setAiMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + parsed.content } : m));
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      setAiMessages(prev => prev.map(m => m.isStreaming ? { ...m, content: 'Errore di rete', isStreaming: false } : m));
    } finally {
      setAiLoading(false);
      aiAbortRef.current = null;
    }
  }, [aiInput, aiLoading, aiMessages, selectedNodeId, nodes, connections]);

  const suggestTitles = useCallback(async () => {
    const node = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
    if (!node) return alert('Seleziona prima un nodo.');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const r = await fetch(`${backendUrl}/api/suggest_node_titles`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint: node.title, context: { nodes: nodes.map(n => ({ id: n.id, title: n.title })), connections: connections.map(c => ({ sourceId: c.sourceId, targetId: c.targetId })) } })
      });
      const data = await r.json();
      const opts: string[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
      if (opts.length === 0) return alert('Nessun suggerimento.');
      const choice = window.prompt(`Scegli un titolo (1-${Math.min(3, opts.length)}):\n` + opts.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n'));
      const idx = choice ? parseInt(choice, 10) - 1 : -1;
      if (idx >= 0 && idx < opts.length) {
        if (window.confirm('Confermi la modifica del titolo?')) {
          const newTitle = opts[idx];
          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, title: newTitle } : n));
          setIsDirty(true);
        }
      }
    } catch {}
  }, [selectedNodeId, nodes, connections]);

  // Propose AI diff (JSON Patch)
  const proposeAiDiff = useCallback(async () => {
    const requestText = aiInput.trim() || window.prompt('Descrivi le modifiche desiderate (es. "Rinomina il nodo 2 in Marketing Digitale e collega 2 con 7")') || '';
    if (!requestText) return;
    if (diffLoading) return;
    setDiffLoading(true);
    setDiffPatch(null);
    setDiffSummary(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const currentMap = {
        nodes: nodes.map(n => ({ id: n.id, title: n.title, x: n.x, y: n.y, borderColor: n.borderColor })),
        connections: connections.map(c => ({ id: c.id, sourceId: c.sourceId, targetId: c.targetId }))
      };
      const selection = selectedNodeId ? { selectedNodeId } : undefined;
      const res = await fetch(`${backendUrl}/api/propose_map_diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_request: requestText, current_map: currentMap, selection, format: 'json-patch' })
      });
      if (!res.ok) throw new Error('Errore di rete');
      const data = await res.json();
      const patch: JsonPatchOp[] = Array.isArray(data?.patch) ? data.patch : [];
      const summary: string | null = typeof data?.summary === 'string' ? data.summary : null;
      setDiffPatch(patch);
      setDiffSummary(summary);
      setShowDiffPanel(true);
    } catch (e: any) {
      alert('Errore nella proposta modifiche: ' + (e?.message || 'sconosciuto'));
    } finally {
      setDiffLoading(false);
    }
  }, [aiInput, diffLoading, nodes, connections, selectedNodeId]);

  const applyProposedDiff = useCallback(() => {
    if (!diffPatch || diffPatch.length === 0) {
      setShowDiffPanel(false);
      return;
    }
    const newState = applyJsonPatch({ nodes, connections }, diffPatch);
    setNodes(newState.nodes);
    setConnections(newState.connections);
    setIsDirty(true);
    setShowDiffPanel(false);
    setDiffPatch(null);
    setDiffSummary(null);
  }, [diffPatch, nodes, connections]);


  // Style helpers for relation selector (colors + SVG icons)
  const getRelationColor = (relation: Connection['relation']): string => {
    switch (relation) {
      case 'causa_effetto': return '#ef4444';
      case 'porta_a': return '#8b5cf6';
      case 'crea': return '#16a34a';
      case 'risolve': return '#22c55e';
      case 'richiede': return '#f59e0b';
      case 'dipende_da': return '#0ea5e9';
      case 'e_uno': return '#6366f1';
      case 'parte_di': return '#14b8a6';
      case 'possiede': return '#10b981';
      case 'utilizza': return '#0ea5e9';
      case 'simile_a': return '#a855f7';
      case 'opposto_a': return '#ef4444';
      case 'generico':
      default: return '#6b7280';
    }
  };

  const renderRelationIcon = (relation: Connection['relation'], color: string) => {
    const common = { stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
    switch (relation) {
      case 'causa_effetto':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <polyline points="5,2 7,6 5,6 9,14 7,10 9,10" {...common} />
          </svg>
        );
      case 'porta_a':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line x1="3" y1="8" x2="12" y2="8" {...common} />
            <polyline points="10,6 13,8 10,10" {...common} />
          </svg>
        );
      case 'crea':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line x1="3" y1="8" x2="13" y2="8" {...common} />
            <line x1="8" y1="3" x2="8" y2="13" {...common} />
          </svg>
        );
      case 'risolve':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M3 9 L7 12 L13 5" {...common} />
          </svg>
        );
      case 'richiede':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line x1="8" y1="3" x2="8" y2="10" {...common as any} />
            <circle cx="8" cy="12.5" r="1" stroke="none" fill={color} />
          </svg>
        );
      case 'dipende_da':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="6" cy="7" r="2.5" {...common} />
            <circle cx="10" cy="9" r="2.5" {...common} />
          </svg>
        );
      case 'e_uno':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M10 3 A6 6 0 1 0 10 13" {...common} />
          </svg>
        );
      case 'parte_di':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M6 3 A6 6 0 0 0 6 13" {...common} />
            <line x1="6" y1="3" x2="13" y2="3" {...common} />
            <line x1="6" y1="13" x2="13" y2="13" {...common} />
          </svg>
        );
      case 'possiede':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <polygon points="8,2 14,8 8,14 2,8" {...common} />
          </svg>
        );
      case 'utilizza':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="3" {...common} />
            <line x1="8" y1="1.5" x2="8" y2="4" {...common} />
            <line x1="13.5" y1="9.5" x2="11" y2="8.5" {...common} />
            <line x1="2.5" y1="9.5" x2="5" y2="8.5" {...common} />
          </svg>
        );
      case 'simile_a':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M2 6 Q 5 3 8 6 T 14 6" {...common} />
            <path d="M2 10 Q 5 7 8 10 T 14 10" {...common} />
          </svg>
        );
      case 'opposto_a':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line x1="3" y1="8" x2="13" y2="8" {...common} />
            <polyline points="5,6 3,8 5,10" {...common} />
            <polyline points="11,6 13,8 11,10" {...common} />
          </svg>
        );
      case 'generico':
      default:
        return null;
    }
  };
  
  const handleEraserClick = useCallback((target: 'node' | 'connection', id: string) => {
    if (activeTool !== 'eraser') return;
    
    if (target === 'node') {
      handleNodeDelete(id);
    } else if (target === 'connection') {
      handleConnectionDelete(id);
    }
  }, [activeTool, handleNodeDelete, handleConnectionDelete]);
  
  const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't interfere with drawing canvas when pencil is active
    if (activeTool === 'pencil') {
      return;
    }
    
    // Only start dragging background if not clicking on a node
    if ((e.target as HTMLElement).closest('[data-node-id]')) {
      return;
    }
    
    const currentTime = Date.now();
    const currentPos = { x: e.clientX, y: e.clientY };
    
    // Check for double click (within 500ms and 10px distance)
    const timeDiff = currentTime - lastClickTime;
    const distance = Math.sqrt(
      Math.pow(currentPos.x - lastClickPos.x, 2) + 
      Math.pow(currentPos.y - lastClickPos.y, 2)
    );
    
    if (timeDiff < 500 && distance < 10) {
      // Double click detected - create new node and clear all selections
      createNewNode(e.clientX, e.clientY);
      setLastClickTime(0); // Reset to prevent triple click
      
      // Clear all selections on double click too
      if (currentEditingNodeId) {
        setCurrentEditingNodeId(null);
      }
      if (isConnectionMode) {
        setConnectionSourceNodeId(null);
        setIsConnectionMode(false);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      }
      if (selectedConnectionId) {
        setSelectedConnectionId(null);
      }
      setPreventNextSelection(false);
      return;
    }
    
    // Single click - clear selections and start dragging
    // Exit editing mode when clicking on background
    if (currentEditingNodeId) {
      setCurrentEditingNodeId(null);
    }
    
    // Cancel connection mode when clicking on background
    if (isConnectionMode) {
      setConnectionSourceNodeId(null);
      setIsConnectionMode(false);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
    
    // Clear connection selection when clicking on background
    if (selectedConnectionId) {
      setSelectedConnectionId(null);
    }
    setPreventNextSelection(false);
    
    // Start dragging
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    });
    
    // Store click info for potential double click
    setLastClickTime(currentTime);
    setLastClickPos(currentPos);
  }, [activeTool, offset, lastClickTime, lastClickPos, createNewNode, currentEditingNodeId, isConnectionMode, selectedConnectionId, preventNextSelection]);
  
  // Terminal container state
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>(['Welcome to Mind Map Terminal']);

  const handleTerminalSubmit = useCallback(() => {
    if (!terminalInput.trim()) return;
    
    const input = terminalInput.trim();
    const output = `user@mindmap:~$ ${input}`;
    
    // Simple command processing
    let response = '';
    if (input === 'help') {
      response = 'Available commands: help, clear, nodes, export, import';
    } else if (input === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    } else if (input === 'nodes') {
      response = `Found ${nodes.length} nodes in current mind map`;
    } else if (input === 'export') {
      exportMindMap();
      response = 'Exporting mind map...';
    } else {
      response = `bash: ${input}: command not found`;
    }
    
    setTerminalHistory(prev => [...prev, output, response]);
    setTerminalInput('');
  }, [terminalInput, nodes.length, exportMindMap]);

  const handleTerminalKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTerminalSubmit();
    } else if (e.key === 'Escape') {
      setShowTerminal(false);
    }
  }, [handleTerminalSubmit]);

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        setOffset({
          x: dragStart.offsetX - deltaX,
          y: dragStart.offsetY - deltaY
        });
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (isConnectionDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        setConnectionDragPosition({ x: e.clientX, y: e.clientY });
      };

      const handleGlobalMouseUp = () => {
        handleConnectionDragEnd();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isConnectionDragging, handleConnectionDragEnd]);

  // Keyboard handler for Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Delete/Backspace if not editing a node
      if (currentEditingNodeId) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectionId) {
          e.preventDefault();
          handleConnectionDelete(selectedConnectionId);
        }
      }
      
      // Escape key to deselect
      if (e.key === 'Escape') {
        if (selectedConnectionId) {
          setSelectedConnectionId(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnectionId, currentEditingNodeId, handleConnectionDelete]);

  if (!authReady || !currentUser || !mapLoaded) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-white overflow-hidden"
      style={{ userSelect: 'none' }}
    >
      {/* Grid Background - only this layer should be draggable */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleBackgroundMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <GridBackground 
          offsetX={offset.x - dimensions.width / 2}
          offsetY={offset.y - dimensions.height / 2}
          viewWidth={dimensions.width}
          viewHeight={dimensions.height}
        />
      </div>

      {/* Connections Layer - positioned below nodes */}
      <div className="mindmap-connections">
        {connections.map((connection) => {
          const sourceNode = nodes.find(n => n.id === connection.sourceId);
          const targetNode = nodes.find(n => n.id === connection.targetId);
          
          if (!sourceNode || !targetNode) return null;
          
          return (
            <CurvedConnection
              key={connection.id}
              connection={connection}
              sourceNode={sourceNode}
              targetNode={targetNode}
              getNodeDimensions={calculateNodeSize}
              dimensions={dimensions}
              offset={offset}
              canvasCenter={CANVAS_CENTER}
              isSelected={selectedConnectionId === connection.id}
              onSelect={activeTool === 'eraser' ? () => handleEraserClick('connection', connection.id) : handleConnectionSelect}
              style={activeTool === 'eraser' ? { cursor: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIwSDdsLTctNyA5LjUtOS41YTMuNTQgMy41NCAwIDAgMSA1IDBsNCA0YTMuNTQgMy41NCAwIDAgMSAwIDVMMTMgMTguNSIgc3Ryb2tlPSIjZWY0NDQ0IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmZWY5ZjkiLz4KPHN2Zz4K") 12 12, auto' } : undefined}
            />
          );
        })}
        
        {/* Connection Drag Preview */}
        {isConnectionDragging && connectionDragStartNode && connectionDragPosition && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 5 }}
          >
            <line
              x1={connectionDragStartNode.x}
              y1={connectionDragStartNode.y}
              x2={connectionDragPosition.x}
              y2={connectionDragPosition.y}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.7"
            />
            <circle
              cx={connectionDragPosition.x}
              cy={connectionDragPosition.y}
              r="3"
              fill="#f59e0b"
              opacity="0.7"
            />
          </svg>
        )}
      </div>

      {/* Mind Map Nodes - draggable */}
      {nodes.map((node) => {
        const nodeDimensions = calculateNodeSize(node.title);
        const screenX = dimensions.width / 2 + node.x - nodeDimensions.width / 2 - offset.x + CANVAS_CENTER;
        const screenY = dimensions.height / 2 + node.y - nodeDimensions.height / 2 - offset.y + CANVAS_CENTER;
        
        return (
          <div key={node.id} data-node-id={node.id} style={{ position: 'relative', zIndex: 10 }}>
            <MindMapNode 
              nodeId={node.id}
              title={node.title}
              color={node.color}
              borderColor={node.borderColor}
              width={nodeDimensions.width}
              height={nodeDimensions.height}
              x={screenX}
              y={screenY}
              onPositionChange={(newX, newY) => {
                const relativeX = newX - dimensions.width / 2 + nodeDimensions.width / 2 + offset.x - CANVAS_CENTER;
                const relativeY = newY - dimensions.height / 2 + nodeDimensions.height / 2 + offset.y - CANVAS_CENTER;
                handleNodePositionChange(node.id, relativeX, relativeY);
              }}
              onDragStateChange={handleNodeDragStateChange}
              onLivePositionUpdate={(liveX, liveY) => {
                const relativeX = liveX - dimensions.width / 2 + nodeDimensions.width / 2 + offset.x - CANVAS_CENTER;
                const relativeY = liveY - dimensions.height / 2 + nodeDimensions.height / 2 + offset.y - CANVAS_CENTER;
                handleLivePositionUpdate(relativeX, relativeY);
              }}
              onTitleChange={handleTitleChange}
              onEditStateChange={handleEditStateChange}
              isEditingFromParent={currentEditingNodeId === node.id}
              onDelete={handleNodeDelete}
              onSelectionChange={handleNodeSelect}
              onConnectionClick={activeTool === 'eraser' ? () => handleEraserClick('node', node.id) : handleConnectionClick}
              isConnectionSource={connectionSourceNodeId === node.id}
              isInConnectionMode={isConnectionMode && activeTool === 'select'}
              onConnectionDragStart={activeTool === 'select' ? handleConnectionDragStart : undefined}
              onConnectionDragEnd={activeTool === 'select' ? handleConnectionDragEnd : undefined}
              preventNextSelection={preventNextSelection}
              onConsumePreventSelection={() => setPreventNextSelection(false)}
              onSuggestExpand={(id) => {
                if (expandingNodeId) return;
                setExpandingNodeId(id);
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const ctx = {
                  nodes: nodes.map(n => ({ id: n.id, title: n.title })),
                  connections: connections.map(c => ({ sourceId: c.sourceId, targetId: c.targetId })),
                } as any;
                /* AI title suggestions removed */
                setTimeout(() => setExpandingNodeId(null), 0);
              }}
              style={activeTool === 'eraser' ? { cursor: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIwSDdsLTctNyA5LjUtOS41YTMuNTQgMy41NCAwIDAgMSA1IDBsNCA0YTMuNTQgMy41NCAwIDAgMSAwIDVMMTMgMTguNSIgc3Ryb2tlPSIjZWY0NDQ0IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmZWY5ZjkiLz4KPHN2Zz4K") 12 12, auto' } : undefined}
            />
          </div>
        );
      })}


      {/* Debug Coordinates Table */}
      <div className="absolute top-16 left-4 bg-black bg-opacity-80 text-white p-3 rounded-lg z-[1000] text-sm min-w-[150px]">
        <div className="font-bold mb-2">Debug Info</div>
        <div className="mb-1">Base: {baseNodeWidth}x{baseNodeHeight}</div>
        <div className="mb-1">Grid: {getFixedGridSize('web')}px (fixed)</div>
        <div className="mb-1">Font: {fontSize}px</div>
        <div className="mb-1">Node X: {debugCoords.nodeX}</div>
        <div className="mb-1">Node Y: {debugCoords.nodeY}</div>
        <div className="mb-1">Live X: {debugCoords.liveNodeX}</div>
        <div className="mb-1">Live Y: {debugCoords.liveNodeY}</div>
        <div className={`${debugCoords.isNodeDragging ? 'text-red-400' : 'text-green-400'}`}>
          Dragging: {debugCoords.isNodeDragging ? 'YES' : 'NO'}
        </div>
      </div>


      {/* Drawing Canvas Layer */}
      <DrawingCanvas
        isActive={activeTool === 'pencil'}
        dimensions={dimensions}
        offset={offset}
        canvasCenter={CANVAS_CENTER}
      />
      
      {/* Toolbar */}
      <ToolBar activeTool={activeTool} onToolChange={handleToolChange} />

      {/* Save/Undo controls */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto flex gap-2">
        {/* Title suggestions rimossi */}
        <button
          onClick={() => {
            if (historyRef.current.length === 0) return;
            const last = historyRef.current.pop();
            if (last) {
              setNodes(last.nodes);
              setConnections(last.connections);
              setHistoryCount(historyRef.current.length);
              setIsDirty(true);
            }
          }}
          className={`px-3 py-2 rounded-lg shadow-lg text-sm font-medium border ${historyRef.current.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}`}
          disabled={historyRef.current.length === 0}
        >
          Indietro
        </button>
        {/* Toggle add to chat context (on/off) */}
        <button
          onClick={() => {
            const mapJson = { id: currentMindMapId, title: 'Mind Map', nodes, connections, createdAt: Date.now(), updatedAt: Date.now() } as any;
            if (inChatContext) {
              StorageManager.removeContextMap(currentMindMapId);
              setInChatContext(false);
            } else {
              StorageManager.upsertContextMap(currentMindMapId, 'Mind Map', mapJson);
              setInChatContext(true);
            }
          }}
          className={`px-3 py-2 rounded-lg shadow-lg text-sm font-medium border ${inChatContext ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}`}
          title="Aggiungi/Rimuovi dal contesto chat"
        >
          {inChatContext ? 'Contesto: ON' : 'Contesto: OFF'}
        </button>
        <button
          onClick={() => {
            if (!currentUser) { alert('Accedi per salvare'); return; }
            const map = { id: currentMindMapId, title: 'Mind Map', nodes, connections, createdAt: Date.now(), updatedAt: Date.now() } as any;
            MindMapsRepo.upsert(currentUser.uid, map).then((id) => {
              if (id && id !== currentMindMapId) {
                // migrate context entry if active
                if (inChatContext) {
                  StorageManager.removeContextMap(currentMindMapId);
                  StorageManager.upsertContextMap(id, 'Mind Map', { ...map, id });
                }
                setCurrentMindMapId(id);
              }
              setIsDirty(false);
            }).catch(() => {});
          }}
          className={`px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${isDirty ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-600 cursor-default'}`}
        >
          Salva
        </button>
      </div>

      {/* Header with controls */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto flex gap-2">
        <Link 
          href="/chatbot"
          className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-100 transition-all duration-200 text-gray-700 text-xl font-medium hover:scale-105"
        >
          ←
        </Link>
        
        <button 
          onClick={() => setShowTerminal(!showTerminal)}
          className="px-3 py-2 bg-gray-800 bg-opacity-90 text-green-400 rounded-lg shadow-lg hover:bg-opacity-100 transition-all duration-200 text-sm font-medium hover:scale-105"
        >
          Terminal
        </button>
        
        <button 
          onClick={exportMindMap}
          className="px-3 py-2 bg-green-500 bg-opacity-90 text-white rounded-lg shadow-lg hover:bg-opacity-100 transition-all duration-200 text-sm font-medium hover:scale-105"
        >
          Export
        </button>
        
        <label className="px-3 py-2 bg-purple-500 bg-opacity-90 text-white rounded-lg shadow-lg hover:bg-opacity-100 transition-all duration-200 text-sm font-medium hover:scale-105 cursor-pointer">
          Import
          <input 
            type="file" 
            accept=".json" 
            onChange={importMindMap} 
            className="hidden" 
          />
        </label>
      </div>

      {/* Connection Relation Selector - custom dropdown with colored text and SVG icons */}
      {selectedConnectionId && (
        <div className="absolute top-4 right-4 z-20 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-200">
            <button
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2"
              onClick={() => setIsRelationMenuOpen(prev => !prev)}
            >
              <span className="text-gray-600">Tipo collegamento</span>
              <span className="ml-auto text-gray-400">▾</span>
            </button>
            {isRelationMenuOpen && (
              <div className="max-h-72 overflow-auto py-1">
                {([
                  'generico',
                  'causa_effetto',
                  'e_uno',
                  'parte_di',
                  'possiede',
                  'richiede',
                  'risolve',
                  'utilizza',
                  'porta_a',
                  'simile_a',
                  'opposto_a',
                  'dipende_da',
                  'crea'
                ] as Connection['relation'][]).map(opt => {
                  const color = getRelationColor(opt);
                  const isActive = connections.find(c => c.id === selectedConnectionId)?.relation === opt;
                  return (
                    <button
                      key={opt}
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-50 ${isActive ? 'bg-gray-50' : ''}`}
                      onClick={() => {
                        setConnections(prev => prev.map(c => c.id === selectedConnectionId ? { ...c, relation: opt } : c));
                        setIsRelationMenuOpen(false);
                      }}
                    >
                      <span className="inline-flex items-center justify-center" style={{ color }}>
                        {renderRelationIcon(opt, color)}
                      </span>
                      <span style={{ color }}>{opt.replace(/_/g, ' ')}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terminal Container */}
      {showTerminal && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
          <div className="w-[800px] h-[300px] bg-gray-900 rounded-xl p-4 shadow-2xl border border-gray-700">
            {/* Terminal Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-400 text-sm font-mono ml-3">user@mindmap: ~</span>
              </div>
              <button
                onClick={() => setShowTerminal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Terminal Output */}
            <div className="h-[200px] overflow-y-auto mb-3 font-mono text-sm">
              {terminalHistory.map((line, index) => (
                <div 
                  key={index} 
                  className={line.startsWith('user@mindmap') ? 'text-green-400' : 'text-gray-300'}
                >
                  {line}
                </div>
              ))}
            </div>

            {/* Terminal Input */}
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-green-400">user@mindmap:~$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyPress={handleTerminalKeyPress}
                placeholder="Type 'help' for available commands"
                className="flex-1 bg-transparent text-gray-300 border-none outline-none placeholder-gray-500"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      {/* Right AI Sidebar */}
      <aside className="fixed right-0 top-0 h-full w-[360px] bg-[#f9fbff] border-l border-gray-200 z-30 pointer-events-auto hidden lg:flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Assistente AI</h2>
          <div className="ml-auto text-xs text-gray-500">
            {selectedNodeId ? `Nodo selezionato` : `Nessun nodo`}
          </div>
        </div>
        <div className="p-3 border-b border-gray-200 text-xs text-gray-600">Proponi modifiche con diff JSON, poi approva.</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {aiMessages.length === 0 && (
            <div className="text-xs text-gray-500">Fai domande sulla mappa. Il contesto include i nodi e quello selezionato.</div>
          )}
          {aiMessages.map(m => (
            <div key={m.id} className={m.role === 'user' ? 'ml-auto max-w-[90%] bg-[#eff6ff] rounded-lg p-3 text-sm' : 'max-w-[90%] p-3 text-sm'}>
              <div className={m.role === 'user' ? 'text-gray-800' : 'text-gray-700'}>{m.content}</div>
              {m.isStreaming && <div className="flex items-center gap-1 mt-1"><span className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"/><span className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{animationDelay:'0.2s'}}/><span className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{animationDelay:'0.4s'}}/></div>}
            </div>
          ))}
        </div>
        {/* Input container styled like chat */}
        <div className="p-4 border-t border-gray-200">
          <div className="bg-[#f3f4f6] rounded-xl p-3 relative">
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder={selectedNodeId ? 'Chiedi in base al nodo selezionato…' : 'Scrivi qui (seleziona un nodo per più contesto)…'}
              className="w-full resize-none bg-[#f3f4f6] focus:outline-none border-none pr-12 text-sm"
              rows={2}
            />
            <button
              onClick={async () => {
                const msg = aiInput.trim();
                if (!msg || aiLoading) return;
                await sendAiMessage();
              }}
              disabled={!aiInput.trim() || aiLoading}
              className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${aiInput.trim() && !aiLoading ? 'bg-[#007AFF] hover:bg-[#0056CC] cursor-pointer' : 'bg-[#CCCCCC] cursor-not-allowed'}`}
              title={aiLoading ? 'Invio in corso…' : 'Invia messaggio'}
            >
              {aiLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="currentColor" transform="rotate(-90 12 12)"/>
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={proposeAiDiff}
              disabled={diffLoading}
              className={`px-3 py-2 rounded text-white text-xs ${diffLoading ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {diffLoading ? 'Calcolo diff…' : 'Proponi Modifiche (Diff)'}
            </button>
            <div className="text-gray-500 ml-auto" style={{fontSize: '11px', lineHeight: '14px'}}>AI-generated, review before apply</div>
          </div>
        </div>
      </aside>

      {/* Diff Panel Modal */}
      {showDiffPanel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDiffPanel(false)} />
          <div className="relative z-10 w-[560px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center">
              <div className="font-semibold text-gray-800 text-sm">Proposta modifiche (JSON Patch)</div>
              <button className="ml-auto text-gray-500 hover:text-gray-700" onClick={() => setShowDiffPanel(false)}>✕</button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto text-sm">
              {diffSummary && (
                <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">{diffSummary}</div>
              )}
              {(!diffPatch || diffPatch.length === 0) ? (
                <div className="text-gray-500">Nessuna modifica proposta.</div>
              ) : (
                <div className="space-y-2">
                  {diffPatch.map((op, i) => (
                    <div key={i} className="font-mono text-xs p-2 bg-gray-50 border border-gray-200 rounded">{JSON.stringify(op)}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center gap-2">
              <button onClick={() => setShowDiffPanel(false)} className="px-3 py-2 rounded border text-sm">Annulla</button>
              <button onClick={applyProposedDiff} className="ml-auto px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm">Approva e Applica</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
