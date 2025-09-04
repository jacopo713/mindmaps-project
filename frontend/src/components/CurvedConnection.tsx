import React, { useState, useCallback } from 'react';
import { Connection, MindMapNode as MindMapNodeType } from '../types';
import { calculateControlPoint } from '../utils/curvature-utils';
import { NodeDimensions } from '../utils/nodeSize';

interface CurvedConnectionProps {
  connection: Connection;
  sourceNode: MindMapNodeType;
  targetNode: MindMapNodeType;
  getNodeDimensions: (text: string) => NodeDimensions;
  dimensions: { width: number; height: number };
  offset: { x: number; y: number };
  canvasCenter: number;
  isSelected?: boolean;
  onSelect?: (connectionId: string) => void;
  style?: React.CSSProperties;
}

export default function CurvedConnection({
  connection,
  sourceNode,
  targetNode,
  getNodeDimensions,
  dimensions,
  offset,
  canvasCenter,
  isSelected = false,
  onSelect,
  style
}: CurvedConnectionProps) {

  // Map relation to stroke color and a compact icon symbol
  const getRelationStyle = (relation?: Connection['relation']) => {
    switch (relation) {
      // Causal / directional relations
      case 'causa_effetto':
        return { color: '#ef4444', symbol: '⚡' };
      case 'porta_a':
        return { color: '#8b5cf6', symbol: '→' };
      case 'crea':
        return { color: '#16a34a', symbol: '+' };
      case 'risolve':
        return { color: '#22c55e', symbol: '✓' };
      case 'richiede':
        return { color: '#f59e0b', symbol: '!' };
      case 'dipende_da':
        return { color: '#0ea5e9', symbol: '⛓' };
      // Non-causal / structural-semantic relations
      case 'e_uno':
        return { color: '#6366f1', symbol: '∈' };
      case 'parte_di':
        return { color: '#14b8a6', symbol: '⊂' };
      case 'possiede':
        return { color: '#10b981', symbol: '◆' };
      case 'utilizza':
        return { color: '#0ea5e9', symbol: '⚙' };
      case 'simile_a':
        return { color: '#a855f7', symbol: '≈' };
      case 'opposto_a':
        return { color: '#ef4444', symbol: '⇄' };
      case 'generico':
      default:
        return { color: '#6b7280', symbol: '' };
    }
  };

  const relationStyle = getRelationStyle(connection.relation);
  const relationStroke = isSelected ? '#3b82f6' : (relationStyle.color || connection.color || '#6b7280');

  // Render a small SVG icon for the relation inside the badge
  const renderRelationIcon = (cx: number, cy: number, color: string, relation?: Connection['relation']) => {
    if (!relation) return null;
    const common = {
      stroke: color,
      strokeWidth: 1.5,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      fill: 'none'
    };
    switch (relation) {
      case 'causa_effetto': // lightning
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <polyline points="-3,-6 -1,-2 -3,-2 1,6 -1,2 1,2" {...common} />
          </g>
        );
      case 'porta_a': // right arrow
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <line x1="-4" y1="0" x2="3" y2="0" {...common} />
            <polyline points="1,-2 4,0 1,2" {...common} />
          </g>
        );
      case 'crea': // plus
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <line x1="-3" y1="0" x2="3" y2="0" {...common} />
            <line x1="0" y1="-3" x2="0" y2="3" {...common} />
          </g>
        );
      case 'risolve': // check
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <path d="M -4 0 L -1 3 L 4 -3" {...common} />
          </g>
        );
      case 'richiede': // exclamation
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <line x1="0" y1="-4" x2="0" y2="1" {...(common as any)} />
            <circle cx="0" cy="3" r="1" stroke="none" fill={color} />
          </g>
        );
      case 'dipende_da': // chain link
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <circle cx="-2" cy="-1" r="2.2" {...common} />
            <circle cx="2" cy="1" r="2.2" {...common} />
          </g>
        );
      case 'e_uno': // category (C arc)
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <path d="M 3 -4 A 6 6 0 1 0 3 4" {...common} />
          </g>
        );
      case 'parte_di': // subset like bracket
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <path d="M -2 -4 A 5 5 0 0 0 -2 4" {...common} />
            <line x1="-2" y1="-4" x2="3" y2="-4" {...common} />
            <line x1="-2" y1="4" x2="3" y2="4" {...common} />
          </g>
        );
      case 'possiede': // diamond
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <polygon points="0,-4 4,0 0,4 -4,0" {...common} />
          </g>
        );
      case 'utilizza': // simple gear: center + 3 spokes
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <circle cx="0" cy="0" r="2" {...common} />
            <line x1="0" y1="-5" x2="0" y2="-3" {...common} />
            <line x1="4.33" y1="2.5" x2="2.6" y2="1.5" {...common} />
            <line x1="-4.33" y1="2.5" x2="-2.6" y2="1.5" {...common} />
          </g>
        );
      case 'simile_a': // approx equal
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <path d="M -4 -2 Q -2 -4 0 -2 T 4 -2" {...common} />
            <path d="M -4 1 Q -2 -1 0 1 T 4 1" {...common} />
          </g>
        );
      case 'opposto_a': // bi-directional arrows
        return (
          <g transform={`translate(${cx}, ${cy})`}>
            <line x1="-3" y1="0" x2="3" y2="0" {...common} />
            <polyline points="-3,0 -1,-2 -1,2" {...common} />
            <polyline points="3,0 1,-2 1,2" {...common} />
          </g>
        );
      default:
        return null;
    }
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(connection.id);
  }, [onSelect, connection.id]);
  // Get dynamic dimensions for both nodes
  const sourceDimensions = getNodeDimensions(sourceNode.title);
  const targetDimensions = getNodeDimensions(targetNode.title);
  // Calculate screen positions for nodes (mobile-compatible: center positions)
  const getNodeScreenPosition = (node: MindMapNodeType) => {
    return {
      x: dimensions.width / 2 + node.x - offset.x + canvasCenter,
      y: dimensions.height / 2 + node.y - offset.y + canvasCenter
    };
  };

  const sourceCenterPos = getNodeScreenPosition(sourceNode);
  const targetCenterPos = getNodeScreenPosition(targetNode);

  // Calculate anchor points on node edges with external padding
  const getAnchorPoint = (
    from: { x: number; y: number }, 
    to: { x: number; y: number },
    nodeDimensions: NodeDimensions
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return from;
    
    const normalizedX = dx / distance;
    const normalizedY = dy / distance;
    
    const halfWidth = nodeDimensions.width / 2;
    const halfHeight = nodeDimensions.height / 2;
    const padding = 8; // 8px padding outside node borders
    
    // Calculate intersection with node rectangle
    const absX = Math.abs(normalizedX);
    const absY = Math.abs(normalizedY);
    
    let anchorX, anchorY;
    
    if (halfWidth * absY < halfHeight * absX) {
      // Intersects with left or right side - add external padding
      anchorX = from.x + (normalizedX > 0 ? halfWidth + padding : -halfWidth - padding);
      anchorY = from.y + normalizedY * halfWidth / absX;
    } else {
      // Intersects with top or bottom side - add external padding
      anchorX = from.x + normalizedX * halfHeight / absY;
      anchorY = from.y + (normalizedY > 0 ? halfHeight + padding : -halfHeight - padding);
    }
    
    return { x: anchorX, y: anchorY };
  };

  const startPoint = getAnchorPoint(sourceCenterPos, targetCenterPos, sourceDimensions);
  const endPoint = getAnchorPoint(targetCenterPos, sourceCenterPos, targetDimensions);

  // Simple curvature calculation (mobile-style)
  const controlPoint = calculateControlPoint(
    startPoint, 
    endPoint, 
    connection.curvature || 0.3
  );

  // Create SVG path for curved connection
  const createPath = () => {
    if (connection.type === 'straight') {
      return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
    } else {
      return `M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`;
    }
  };

  // Calculate arrow position and rotation
  const getArrowTransform = () => {
    const dx = endPoint.x - controlPoint.x;
    const dy = endPoint.y - controlPoint.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    return {
      x: endPoint.x,
      y: endPoint.y,
      rotation: angle
    };
  };

  const arrow = getArrowTransform();
  const pathData = createPath();

  // Calculate midpoint for delete button positioning
  const midPoint = {
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2
  };

  // Only render if both nodes are visible on screen
  const isVisible = (
    startPoint.x >= -100 && startPoint.x <= dimensions.width + 100 &&
    startPoint.y >= -100 && startPoint.y <= dimensions.height + 100 &&
    endPoint.x >= -100 && endPoint.x <= dimensions.width + 100 &&
    endPoint.y >= -100 && endPoint.y <= dimensions.height + 100
  );

  if (!isVisible) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      {/* Invisible thick path for click detection */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="15"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ 
          pointerEvents: 'auto', 
          cursor: 'pointer',
          ...style
        }}
        onClick={handleClick}
      />
      
      {/* Visible connection line */}
      <path
        d={pathData}
        stroke={relationStroke}
        strokeWidth={isSelected ? (connection.width || 2) + 1 : (connection.width || 2)}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Arrow */}
      {connection.showArrow && connection.arrowPosition === 'end' && (
        <polygon
          points="0,-4 8,0 0,4"
          fill={relationStroke}
          transform={`translate(${arrow.x}, ${arrow.y}) rotate(${arrow.rotation})`}
        />
      )}

      {/* Relation icon badge at midpoint (hidden for 'generico') */}
      {connection.relation && connection.relation !== 'generico' && (
        <g style={{ pointerEvents: 'none' }}>
          <circle
            cx={midPoint.x}
            cy={midPoint.y - 10}
            r={10}
            fill="#ffffff"
            stroke={relationStroke}
            strokeWidth={1}
            opacity={0.95}
          />
          {renderRelationIcon(midPoint.x, midPoint.y - 10, relationStroke, connection.relation)}
        </g>
      )}

      {/* Debug: Control point (optional) */}
      {process.env.NODE_ENV === 'development' && connection.type === 'curved' && (
        <circle
          cx={controlPoint.x}
          cy={controlPoint.y}
          r="2"
          fill="red"
          opacity="0.3"
        />
      )}
    </svg>
  );
}