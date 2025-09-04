import React, { useState, useCallback, useRef } from 'react';
import { NodeDimensions, getTextDisplayOptions } from '../utils/nodeSize';

interface MindMapNodeProps {
  nodeId: string;
  title: string;
  borderColor?: string;
  color?: string;
  width?: number;
  height?: number;
  x: number;
  y: number;
  onPositionChange: (x: number, y: number) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onLivePositionUpdate?: (x: number, y: number) => void;
  onTitleChange?: (nodeId: string, newTitle: string) => void;
  onEditStateChange?: (nodeId: string, isEditing: boolean) => void;
  isEditingFromParent?: boolean; // Controlled by parent to force exit editing
  onDelete?: (nodeId: string) => void;
  isSelected?: boolean;
  onSelectionChange?: (nodeId: string) => void;
  onConnectionClick?: (nodeId: string, isCtrlClick: boolean) => void;
  isConnectionSource?: boolean;
  isInConnectionMode?: boolean;
  onConnectionDragStart?: (nodeId: string, mouseX: number, mouseY: number) => void;
  onConnectionDragEnd?: (targetNodeId?: string) => void;
  // When true, the next click on the node should not select it (used after creating a connection)
  preventNextSelection?: boolean;
  // Callback to consume/reset the preventNextSelection flag in parent when used
  onConsumePreventSelection?: () => void;
  // New: trigger node expansion suggestions
  onSuggestExpand?: (nodeId: string) => void;
  style?: React.CSSProperties;
}

export default function MindMapNode({ 
  nodeId,
  title, 
  borderColor = '#e2e8f0',
  color = '#ffffff',
  width = 140, 
  height = 80,
  x,
  y,
  onPositionChange,
  onDragStateChange,
  onLivePositionUpdate,
  onTitleChange,
  onEditStateChange,
  isEditingFromParent = false,
  onDelete,
  isSelected = false,
  onSelectionChange,
  onConnectionClick,
  isConnectionSource = false,
  isInConnectionMode = false,
  onConnectionDragStart,
  onConnectionDragEnd,
  preventNextSelection,
  onConsumePreventSelection,
  onSuggestExpand,
  style
}: MindMapNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  
  // Double click detection
  const [lastClickTime, setLastClickTime] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if click is in delete area (top-right corner)
  const isClickInDeleteArea = useCallback((e: React.MouseEvent, nodeElement: HTMLElement) => {
    const rect = nodeElement.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;
    
    // Define delete area as top-right 20x20 pixels
    const deleteAreaSize = 20;
    const isInDeleteArea = 
      relativeX >= width - deleteAreaSize && 
      relativeX <= width && 
      relativeY >= 0 && 
      relativeY <= deleteAreaSize;
    
    return isInDeleteArea;
  }, [width]);

  // Click handling with selection, double click detection, delete area check, and drag state management
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isEditing) return; // Don't handle clicks when editing
    
    // Swallow the very next click after a connection is created to avoid selecting/dragging
    if (preventNextSelection) {
      e.stopPropagation();
      e.preventDefault();
      onConsumePreventSelection?.();
      return;
    }

    // Check if this is an eraser tool click anywhere on the node
    if (style?.cursor?.includes('eraser')) {
      e.stopPropagation();
      e.preventDefault();
      onConnectionClick?.(nodeId, false); // Use connection click handler for eraser
      return;
    }
    
    // Check if click is in delete area
    if (isClickInDeleteArea(e, e.currentTarget as HTMLElement)) {
      e.stopPropagation();
      e.preventDefault();
      onDelete?.(nodeId);
      return;
    }
    
    // If node is currently being dragged, stop dragging on click
    if (isDragging) {
      setIsDragging(false);
      onDragStateChange?.(false);
      // Cancel any pending drag timeout
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
      return;
    }
    
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;
    
    if (timeDiff < 400 && clickCount === 1) {
      // Double click detected - cancel any pending drag and enter edit mode
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
      
      setIsEditing(true);
      setEditTitle(title);
      onEditStateChange?.(nodeId, true);
      setClickCount(0);
      setLastClickTime(0);
      
      // Focus input after state update
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      
      return;
    }
    
    // Handle connection click
    if (e.ctrlKey || (isInConnectionMode && !isConnectionSource)) {
      // Ctrl+Click for first node, or normal click for second node when in connection mode
      onConnectionClick?.(nodeId, e.ctrlKey);
      return;
    }
    
    // Single click - handle selection
    onSelectionChange?.(nodeId);
    
    setClickCount(1);
    setLastClickTime(currentTime);
    
    // Reset click count after timeout
    setTimeout(() => {
      setClickCount(0);
    }, 400);
  }, [isEditing, lastClickTime, clickCount, title, nodeId, onEditStateChange, isClickInDeleteArea, onDelete, onSelectionChange, isDragging, onDragStateChange, style, isInConnectionMode, isConnectionSource, onConnectionClick, preventNextSelection, onConsumePreventSelection]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return; // Don't drag when editing
    
    // Block immediate drag attempts right after a connection is created
    if (preventNextSelection) {
      e.preventDefault();
      e.stopPropagation();
      onConsumePreventSelection?.();
      return;
    }

    // Don't drag when eraser tool is active
    if (style?.cursor?.includes('eraser')) {
      return;
    }
    
    // Don't start dragging if clicking in delete area
    if (isClickInDeleteArea(e, e.currentTarget as HTMLElement)) {
      return;
    }
    
    // Don't start new drag if already dragging
    if (isDragging) {
      return;
    }
    
    // Handle Ctrl+MouseDown for drag connection
    if (e.ctrlKey && onConnectionDragStart) {
      e.preventDefault();
      e.stopPropagation();
      onConnectionDragStart(nodeId, e.clientX, e.clientY);
      return;
    }
    
    // Don't start dragging if in connection mode (except for Ctrl+drag above)
    if (isInConnectionMode) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Cancel any existing drag timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    // Add delay before starting drag to allow double click detection and selection
    dragTimeoutRef.current = setTimeout(() => {
      if (clickCount < 2 && !isEditing && !isDragging) {
        // Only start drag if not already dragging
        setIsDragging(true);
        onDragStateChange?.(true);
        setDragStart({
          x: e.clientX,
          y: e.clientY,
          nodeX: x,
          nodeY: y
        });
      }
      dragTimeoutRef.current = null;
    }, isSelected ? 100 : 150); // Faster drag start if already selected
  }, [x, y, onDragStateChange, isEditing, clickCount, isClickInDeleteArea, isSelected, isDragging, preventNextSelection, onConsumePreventSelection, style, onConnectionDragStart, isInConnectionMode, nodeId]);


  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Check if this is a connection drag end on this node
    if (onConnectionDragEnd && isInConnectionMode && !isConnectionSource) {
      e.preventDefault();
      e.stopPropagation();
      onConnectionDragEnd(nodeId);
      return;
    }
    
    setIsDragging(false);
    onDragStateChange?.(false);
  }, [onDragStateChange, onConnectionDragEnd, isInConnectionMode, isConnectionSource, nodeId]);

  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(false);
    onDragStateChange?.(false);
  }, [onDragStateChange]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const newX = dragStart.nodeX + deltaX;
    const newY = dragStart.nodeY + deltaY;
    
    onLivePositionUpdate?.(newX, newY);
    onPositionChange(newX, newY);
  }, [isDragging, dragStart, onPositionChange, onLivePositionUpdate]);

  // Edit mode handlers
  const handleEditConfirm = useCallback(() => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== title) {
      onTitleChange?.(nodeId, trimmedTitle);
    }
    setIsEditing(false);
    onEditStateChange?.(nodeId, false);
  }, [editTitle, title, nodeId, onTitleChange, onEditStateChange]);

  const handleEditCancel = useCallback(() => {
    setEditTitle(title);
    setIsEditing(false);
    onEditStateChange?.(nodeId, false);
  }, [title, nodeId, onEditStateChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      // Prevent default newline behavior and confirm edit
      e.preventDefault();
      handleEditConfirm();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  }, [handleEditConfirm, handleEditCancel]);

  // Update editTitle when title prop changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditTitle(title);
    }
  }, [title, isEditing]);

  // Handle forced exit from parent (e.g., background click)
  React.useEffect(() => {
    if (!isEditingFromParent && isEditing) {
      handleEditCancel();
    }
  }, [isEditingFromParent, isEditing, handleEditCancel]);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Cleanup timeout on component unmount
  React.useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    };
  }, []);

  // Calculate dynamic text display options
  const nodeDimensions: NodeDimensions = { width: width || 120, height: height || 65 };
  const textOptions = getTextDisplayOptions(title, nodeDimensions);
  const optimalRows = textOptions.optimalLines;

  return (
    <div 
      className={`group flex items-center justify-center rounded-lg shadow-sm border ${
        isDragging ? 'cursor-grabbing' : isEditing ? 'cursor-text' : isSelected ? 'cursor-grab' : 'cursor-pointer'
      }`}
      style={{
        borderColor: '#e5e7eb',
        borderLeft: `3px solid ${isConnectionSource ? '#f59e0b' : borderColor}`,
        backgroundColor: color,
        width: `${width}px`,
        height: `${height}px`,
        position: 'absolute',
        left: x,
        top: y,
        zIndex: isDragging ? 1000 : isConnectionSource ? 50 : 10,
        boxShadow: isConnectionSource 
          ? '0 0 0 2px rgba(245, 158, 11, 0.3)'
          : '0 2px 4px rgba(0, 0, 0, 0.04)',
        ...style
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {/* Hover Lightbulb - top-left (to avoid delete button area) */}
      {!isEditing && !isDragging && !style?.cursor?.includes('eraser') && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onSuggestExpand?.(nodeId); }}
          className="absolute -left-3 -top-3 w-7 h-7 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
          title="Suggerisci sotto-nodi"
          style={{ zIndex: 1001 }}
        >
          💡
        </button>
      )}

      {isEditing ? (
        <textarea
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleEditConfirm}
          className="w-full h-full bg-transparent text-slate-700 font-semibold text-center px-1.5 py-1 border-none outline-none resize-none overflow-y-auto"
          style={{ 
            fontSize: `${Math.max(12, Math.min(18, width * 0.107))}px`,
            lineHeight: '1.25',
            wordWrap: 'break-word'
          }}
          placeholder="Rinomina nodo..."
          maxLength={100}
          rows={optimalRows}
          wrap="soft"
        />
      ) : (
        <div 
          className="text-slate-700 font-semibold text-center px-1.5 py-1 leading-snug tracking-[0.01em] pointer-events-none select-none w-full h-full flex items-center justify-center overflow-wrap-anywhere"
          style={{ 
            fontSize: `${Math.max(12, Math.min(18, width * 0.107))}px`,
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.25'
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
}