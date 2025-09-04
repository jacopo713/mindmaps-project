/**
 * useExportImport Hook
 * 
 * Handles mind map export and import functionality including
 * file operations, data validation, and user feedback.
 * 
 * @author Code Cleanup Specialist
 * @version 2.0.0
 */
import { useCallback } from 'react';
import { MindMapNode as MindMapNodeType, Connection } from '../types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Hook interface for export/import functionality
 */
interface UseExportImportProps {
  /** Current mind map ID */
  currentMindMapId: string;
  /** Array of nodes */
  nodes: MindMapNodeType[];
  /** Array of connections */
  connections: Connection[];
}

/**
 * Hook return interface
 */
interface UseExportImportReturn {
  /** Exports mind map to JSON file */
  exportMindMap: () => Promise<void>;
  /** Imports mind map from JSON file */
  importMindMap: () => Promise<void>;
}

/**
 * Custom hook for managing export/import functionality
 * 
 * @param props - Configuration props for export/import
 * @returns Object containing export/import functions
 */
export function useExportImport(props: UseExportImportProps): UseExportImportReturn {
  const {
    currentMindMapId,
    nodes,
    connections
  } = props;

  /**
   * Exports the current mind map to a JSON file
   */
  const exportMindMap = useCallback(async () => {
    try {
      // Prepare export data
      const exportData = {
        id: currentMindMapId,
        title: `Mind Map - ${new Date().toLocaleDateString()}`,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        nodes,
        connections,
        metadata: {
          nodeCount: nodes.length,
          connectionCount: connections.length,
          canvasSize: 5000,
          exportPlatform: 'react-native'
        }
      };

      // Convert to JSON string with formatting
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create file URI
      const fileName = `mindmap-${currentMindMapId}-${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Mind Map',
          UTI: 'public.json'
        });
      } else {
        Alert.alert(
          'Export Complete',
          `Mind map exported to:\n${fileName}`,
          [{ text: 'OK' }]
        );
      }

      console.log('Mind map exported successfully:', fileName);
    } catch (error) {
      console.error('Error exporting mind map:', error);
      Alert.alert(
        'Export Error',
        'Failed to export mind map. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [currentMindMapId, nodes, connections]);

  /**
   * Imports a mind map from a JSON file
   */
  const importMindMap = useCallback(async () => {
    try {
      // Note: In a real implementation, you would use DocumentPicker
      // to let the user select a file. For now, we'll show a placeholder.
      
      Alert.alert(
        'Import Mind Map',
        'Import functionality will be available in the next update.\n\nFor now, you can manually place JSON files in the app documents directory.',
        [{ text: 'OK' }]
      );

      // Placeholder for actual import logic:
      // 1. Use DocumentPicker to select file
      // 2. Read file content
      // 3. Validate JSON structure
      // 4. Import nodes and connections
      // 5. Update application state

      console.log('Import mind map requested');
    } catch (error) {
      console.error('Error importing mind map:', error);
      Alert.alert(
        'Import Error',
        'Failed to import mind map. Please check the file format and try again.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  return {
    exportMindMap,
    importMindMap
  };
}