import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Switch,
  SafeAreaView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DebugCoords {
  nodeX: number;
  nodeY: number;
  liveNodeX: number;
  liveNodeY: number;
  translateX: number;
  translateY: number;
  isNodeDragging: boolean;
}

interface MindMapStats {
  nodesCount: number;
  connectionsCount: number;
  sessionStartTime: number;
}

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
  debugCoords: DebugCoords;
  activeTool: string;
  zoomFactor: number;
  mindMapStats: MindMapStats;
  baseNodeWidth: number;
  baseNodeHeight: number;
  gridSize: number;
  fontSize: number;
  onResetView?: () => void;
  onClearCache?: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  visible,
  onClose,
  debugCoords,
  activeTool,
  zoomFactor,
  mindMapStats,
  baseNodeWidth,
  baseNodeHeight,
  gridSize,
  fontSize,
  onResetView,
  onClearCache,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Calculate session duration
  const sessionDuration = Math.floor((Date.now() - mindMapStats.sessionStartTime) / 1000);
  const sessionMinutes = Math.floor(sessionDuration / 60);
  const sessionSeconds = sessionDuration % 60;

  // Status indicators
  const getStatusColor = (condition: boolean) => condition ? '#22c55e' : '#ef4444';
  const getStatusText = (condition: boolean) => condition ? 'OK' : 'WARN';

  const handleResetView = () => {
    Alert.alert(
      'Reset View',
      'Vuoi resettare la vista alla posizione centrale?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Reset', onPress: () => onResetView?.() },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Vuoi eliminare tutti i dati salvati in cache?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Elimina', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              onClearCache?.();
              Alert.alert('Cache Cleared', 'Tutti i dati sono stati eliminati');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare la cache');
            }
          }
        },
      ]
    );
  };

  const exportDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      activeTool,
      zoomFactor,
      debugCoords,
      mindMapStats,
      settings: {
        baseNodeWidth,
        baseNodeHeight,
        gridSize,
        fontSize,
      },
      sessionInfo: {
        duration: sessionDuration,
        platform: 'mobile',
      },
    };

    // In a real app, you'd export this to a file or share it
    console.log('Debug Export:', JSON.stringify(debugData, null, 2));
    Alert.alert('Debug Export', 'Dati debug esportati nella console');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop - deve essere dietro al panel */}
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        
        {/* Panel Container */}
        <View style={styles.panelContainer}>
          <SafeAreaView style={styles.panel}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                    stroke="#6b7280"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.headerTitle}>Debug & Settings</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Current Tool & Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Status</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Active Tool:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#3b82f6' }]}>
                    <Text style={styles.statusBadgeText}>{activeTool.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Dragging:</Text>
                  <Text 
                    style={[
                      styles.statusValue, 
                      { color: getStatusColor(!debugCoords.isNodeDragging) }
                    ]}
                  >
                    {debugCoords.isNodeDragging ? 'YES' : 'NO'}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Zoom Level:</Text>
                  <Text style={styles.statusValue}>{Math.round(zoomFactor * 100)}%</Text>
                </View>
              </View>

              {/* MindMap Statistics */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MindMap Stats</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{mindMapStats.nodesCount}</Text>
                    <Text style={styles.statLabel}>Nodes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{mindMapStats.connectionsCount}</Text>
                    <Text style={styles.statLabel}>Connections</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{sessionMinutes}:{sessionSeconds.toString().padStart(2, '0')}</Text>
                    <Text style={styles.statLabel}>Session</Text>
                  </View>
                </View>
              </View>

              {/* Coordinates Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Coordinates</Text>
                <View style={styles.coordsGrid}>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Node X:</Text>
                    <Text style={styles.coordValue}>{debugCoords.nodeX}</Text>
                  </View>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Node Y:</Text>
                    <Text style={styles.coordValue}>{debugCoords.nodeY}</Text>
                  </View>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Live X:</Text>
                    <Text style={styles.coordValue}>{debugCoords.liveNodeX}</Text>
                  </View>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Live Y:</Text>
                    <Text style={styles.coordValue}>{debugCoords.liveNodeY}</Text>
                  </View>
                </View>
              </View>

              {/* Settings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Debug Mode</Text>
                  <Switch
                    value={debugMode}
                    onValueChange={setDebugMode}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                    thumbColor={debugMode ? '#ffffff' : '#f3f4f6'}
                  />
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Advanced Info</Text>
                  <Switch
                    value={showAdvanced}
                    onValueChange={setShowAdvanced}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                    thumbColor={showAdvanced ? '#ffffff' : '#f3f4f6'}
                  />
                </View>
              </View>

              {/* Advanced Info */}
              {showAdvanced && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Technical Info</Text>
                  <View style={styles.techInfo}>
                    <Text style={styles.techLabel}>Base Node: {baseNodeWidth}x{baseNodeHeight}</Text>
                    <Text style={styles.techLabel}>Grid Size: {gridSize}px</Text>
                    <Text style={styles.techLabel}>Font Size: {fontSize}px</Text>
                    <Text style={styles.techLabel}>Platform: React Native</Text>
                    <Text style={styles.techLabel}>Render: SVG + Animated</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleResetView}>
                    <Text style={styles.actionButtonText}>Reset View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleClearCache}>
                    <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Clear Cache</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={exportDebugData}>
                    <Text style={styles.actionButtonText}>Export Debug</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 320,
    zIndex: 1,
  },
  panel: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#d1d5db',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f9fafb',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  coordsGrid: {
    gap: 8,
  },
  coordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  coordValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f59e0b',
    fontFamily: 'monospace',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: '#d1d5db',
  },
  techInfo: {
    gap: 8,
  },
  techLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  actionButtons: {
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d1d5db',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  dangerButtonText: {
    color: 'white',
  },
});

export default DebugPanel;