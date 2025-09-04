'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface DrawingCanvasProps {
  isActive: boolean;
  dimensions: { width: number; height: number };
  offset: { x: number; y: number };
  canvasCenter: number;
  onDrawingChange?: (strokes: Stroke[]) => void;
}

export default function DrawingCanvas({ 
  isActive, 
  dimensions, 
  offset, 
  canvasCenter,
  onDrawingChange 
}: DrawingCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Drawing settings
  const strokeColor = '#2563eb'; // Blue color
  const strokeWidth = 3;

  const startDrawing = useCallback((e: React.MouseEvent) => {
    if (!isActive || !svgRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = svgRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const newStroke: Stroke = {
      id: Date.now().toString(),
      points: [point],
      color: strokeColor,
      width: strokeWidth
    };
    
    setCurrentStroke(newStroke);
    setIsDrawing(true);
  }, [isActive, strokeColor, strokeWidth]);

  const continueDrawing = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentStroke || !svgRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = svgRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setCurrentStroke(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, point]
      };
    });
  }, [isDrawing, currentStroke]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentStroke) return;
    
    setStrokes(prev => {
      const newStrokes = [...prev, currentStroke];
      onDrawingChange?.(newStrokes);
      return newStrokes;
    });
    
    setCurrentStroke(null);
    setIsDrawing(false);
  }, [isDrawing, currentStroke, onDrawingChange]);

  // Convert points to SVG path
  const pointsToPath = useCallback((points: Point[]): string => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      path += ` Q ${points[i - 1].x} ${points[i - 1].y} ${xc} ${yc}`;
    }
    
    // Add the last point
    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      path += ` T ${lastPoint.x} ${lastPoint.y}`;
    }
    
    return path;
  }, []);

  // Global mouse events for drawing
  useEffect(() => {
    if (!isDrawing) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!svgRef.current || !currentStroke) return;
      
      const rect = svgRef.current.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      setCurrentStroke(prev => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...prev.points, point]
        };
      });
    };

    const handleGlobalMouseUp = () => {
      stopDrawing();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDrawing, currentStroke, stopDrawing]);

  // Clear all strokes
  const clearDrawing = useCallback(() => {
    setStrokes([]);
    setCurrentStroke(null);
    onDrawingChange?.([]);
  }, [onDrawingChange]);

  if (!isActive) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ 
        zIndex: 15,
        cursor: 'crosshair'
      }}
      width={dimensions.width}
      height={dimensions.height}
      onMouseDown={startDrawing}
      onMouseMove={continueDrawing}
      onMouseUp={stopDrawing}
    >
      {/* Completed strokes */}
      {strokes.map((stroke) => (
        <path
          key={stroke.id}
          d={pointsToPath(stroke.points)}
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      ))}
      
      {/* Current stroke being drawn */}
      {currentStroke && currentStroke.points.length > 0 && (
        <path
          d={pointsToPath(currentStroke.points)}
          fill="none"
          stroke={currentStroke.color}
          strokeWidth={currentStroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
      )}
      
      {/* Clear button when there are strokes */}
      {strokes.length > 0 && (
        <foreignObject x={dimensions.width - 100} y={20} width="80" height="30">
          <button
            onClick={clearDrawing}
            className="w-full h-full bg-red-500 hover:bg-red-600 text-white text-xs rounded-md transition-colors duration-200"
            style={{ fontSize: '10px' }}
          >
            Cancella tutto
          </button>
        </foreignObject>
      )}
    </svg>
  );
}