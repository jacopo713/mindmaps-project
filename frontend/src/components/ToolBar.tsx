'use client';

import { useState } from 'react';

export type ToolType = 'select' | 'pencil' | 'eraser';

interface ToolBarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

export default function ToolBar({ activeTool, onToolChange }: ToolBarProps) {
  const tools = [
    {
      id: 'select' as ToolType,
      name: 'Selezione',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      )
    },
    {
      id: 'pencil' as ToolType,
      name: 'Matita',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      )
    },
    {
      id: 'eraser' as ToolType,
      name: 'Gomma',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 20H7l-7-7 9.5-9.5a3.54 3.54 0 0 1 5 0l4 4a3.54 3.54 0 0 1 0 5L13 18.5" />
        </svg>
      )
    }
  ];

  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-30 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-2">
      <div className="flex flex-col gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`
              relative w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200
              ${activeTool === tool.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }
              hover:scale-105 active:scale-95
            `}
            title={tool.name}
          >
            {tool.icon}
            
            {/* Active indicator */}
            {activeTool === tool.id && (
              <div className="absolute -right-1 -top-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>
      
      {/* Toolbar label */}
      <div className="mt-3 pt-2 border-t border-gray-700">
        <div className="text-xs text-gray-400 text-center font-medium">
          Strumenti
        </div>
      </div>
    </div>
  );
}