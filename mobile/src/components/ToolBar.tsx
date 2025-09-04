import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { ToolType } from '../types';

interface ToolBarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

interface ToolIconProps {
  tool: ToolType;
  isActive: boolean;
}

// Adobe-style tool icons as SVG components
const ToolIcon: React.FC<ToolIconProps> = ({ tool, isActive }) => {
  const color = isActive ? '#ffffff' : '#e5e7eb';
  
  switch (tool) {
    case 'select':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path 
            d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" 
            stroke={color} 
            strokeWidth={2} 
            fill="none"
          />
        </Svg>
      );
    
    case 'pencil':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path 
            d="M12 19l7-7 3 3-7 7-3-3z" 
            stroke={color} 
            strokeWidth={2} 
            fill="none"
          />
          <Path 
            d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" 
            stroke={color} 
            strokeWidth={2} 
            fill="none"
          />
          <Path 
            d="M2 2l7.586 7.586" 
            stroke={color} 
            strokeWidth={2}
          />
          <Circle 
            cx={11} 
            cy={11} 
            r={2} 
            stroke={color} 
            strokeWidth={2} 
            fill="none"
          />
        </Svg>
      );
    
    default:
      return null;
  }
};

const ToolBar: React.FC<ToolBarProps> = ({ activeTool, onToolChange }) => {
  const tools: { id: ToolType; name: string }[] = [
    { id: 'select', name: 'Selezione' },
    { id: 'pencil', name: 'Matita' }
  ];

  const handleToolPress = async (tool: ToolType) => {
    // Haptic feedback for better mobile UX
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToolChange(tool);
  };

  return (
    <View style={styles.container}>
      {/* Testo z-index visibile per toolbar */}
      <Text
        style={{
          position: 'absolute',
          top: -25,
          left: 0,
          color: 'rgba(0, 0, 0, 0.8)',
          fontSize: 10,
          fontWeight: 'bold',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          paddingHorizontal: 4,
          borderRadius: 4,
        }}>
        zIndex: 1000 (ToolBar)
      </Text>
      <View style={styles.toolsContainer}>
        {tools.map((tool, index) => (
          <TouchableOpacity
            key={tool.id}
            style={[
              styles.toolButton,
              activeTool === tool.id && styles.toolButtonActive
            ]}
            onPress={() => handleToolPress(tool.id)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ToolIcon tool={tool.id} isActive={activeTool === tool.id} />
            
            {/* Active indicator */}
            {activeTool === tool.id && (
              <View style={styles.activeIndicator} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Toolbar label */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Strumenti</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    top: '25%',
    zIndex: 1000, // zIndex: 1000 per toolbar (controlli UI)
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  toolsContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  toolButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#404040',
  },
  toolButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34d399',
    borderWidth: 2,
    borderColor: '#2d2d2d',
  },
  labelContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  label: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ToolBar;