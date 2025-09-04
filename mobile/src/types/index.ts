export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface MindMapNode {
  id: string;
  title: string;
  x: number; // Absolute coordinates in canvas system
  y: number; // Absolute coordinates in canvas system
  color?: string; // Optional node color
  borderColor?: string; // Optional border color
  dimensions?: { // Optional cached dimensions for performance
    width: number;
    height: number;
  };
}

export interface MindMapNodeEditingProps {
  onTitleChange?: (nodeId: string, newTitle: string) => void;
  isEditing?: boolean;
  onEditStateChange?: (nodeId: string, isEditing: boolean) => void;
}

export interface Connection {
  id: string;
  sourceId: string; // ID of source node
  targetId: string; // ID of target node
  type: 'straight' | 'curved'; // Connection type
  curvature?: number; // Curvature intensity (0-1), only for curved connections
  adaptiveCurvature?: boolean; // Enable adaptive curvature based on direction
  curvatureDirection?: 'auto' | 'clockwise' | 'counterclockwise'; // Direction of curve
  color?: string; // Connection line color
  width?: number; // Connection line width
  showArrow?: boolean; // Whether to show arrow
  arrowPosition?: 'end' | 'start' | 'both'; // Arrow position
}

export interface MindMap {
  id: string;
  title: string;
  nodes: MindMapNode[];
  connections: Connection[];
  createdAt: number;
  updatedAt: number;
}

export interface MindMapExport {
  version: string;
  mindMap: MindMap;
  exportedAt: number;
}

// Toolbar system types
export type ToolType = 'select' | 'pencil' | 'connection';

export interface DrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}