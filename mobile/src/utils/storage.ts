import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chat, Message, MindMap, MindMapExport } from '../types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const STORAGE_KEYS = {
  CHATS: 'chats',
  MINDMAPS: 'mindmaps',
};

export class StorageManager {
  // Chat management
  static async getChats(): Promise<Chat[]> {
    try {
      const chatsJson = await AsyncStorage.getItem(STORAGE_KEYS.CHATS);
      return chatsJson ? JSON.parse(chatsJson) : [];
    } catch (error) {
      console.error('Error loading chats:', error);
      return [];
    }
  }

  static async saveChats(chats: Chat[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
    } catch (error) {
      console.error('Error saving chats:', error);
    }
  }

  static async createChat(title?: string): Promise<Chat> {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: title || 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const chats = await this.getChats();
    chats.unshift(newChat);
    await this.saveChats(chats);
    
    return newChat;
  }

  static async updateChat(chatId: string, messages: Message[]): Promise<void> {
    const chats = await this.getChats();
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].messages = messages;
      chats[chatIndex].updatedAt = Date.now();
      
      // Update title based on first message
      if (messages.length > 0 && chats[chatIndex].title === 'New Chat') {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          chats[chatIndex].title = firstUserMessage.content.slice(0, 50) + 
            (firstUserMessage.content.length > 50 ? '...' : '');
        }
      }
      
      await this.saveChats(chats);
    }
  }

  static async deleteChat(chatId: string): Promise<void> {
    const chats = await this.getChats();
    const filteredChats = chats.filter(chat => chat.id !== chatId);
    await this.saveChats(filteredChats);
  }

  static async renameChat(chatId: string, newTitle: string): Promise<void> {
    const chats = await this.getChats();
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].title = newTitle.trim();
      chats[chatIndex].updatedAt = Date.now();
      await this.saveChats(chats);
    }
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CHATS);
      await AsyncStorage.removeItem(STORAGE_KEYS.MINDMAPS);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  // MindMap management
  static async getMindMaps(): Promise<MindMap[]> {
    try {
      const mindMapsJson = await AsyncStorage.getItem(STORAGE_KEYS.MINDMAPS);
      return mindMapsJson ? JSON.parse(mindMapsJson) : [];
    } catch (error) {
      console.error('Error loading mind maps:', error);
      return [];
    }
  }

  static async saveMindMaps(mindMaps: MindMap[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MINDMAPS, JSON.stringify(mindMaps));
    } catch (error) {
      console.error('Error saving mind maps:', error);
    }
  }

  static async createMindMap(title?: string): Promise<MindMap> {
    const newMindMap: MindMap = {
      id: Date.now().toString(),
      title: title || 'New Mind Map',
      nodes: [],
      connections: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const mindMaps = await this.getMindMaps();
    mindMaps.unshift(newMindMap);
    await this.saveMindMaps(mindMaps);
    
    return newMindMap;
  }

  static async updateMindMap(mindMapId: string, updatedMindMap: Partial<MindMap>): Promise<void> {
    const mindMaps = await this.getMindMaps();
    const mindMapIndex = mindMaps.findIndex(map => map.id === mindMapId);
    
    if (mindMapIndex !== -1) {
      mindMaps[mindMapIndex] = {
        ...mindMaps[mindMapIndex],
        ...updatedMindMap,
        updatedAt: Date.now(),
      };
      await this.saveMindMaps(mindMaps);
    }
  }

  static async deleteMindMap(mindMapId: string): Promise<void> {
    const mindMaps = await this.getMindMaps();
    const filteredMindMaps = mindMaps.filter(map => map.id !== mindMapId);
    await this.saveMindMaps(filteredMindMaps);
  }

  // Import/Export functionality
  static async exportMindMap(mindMapId: string): Promise<MindMapExport | null> {
    const mindMaps = await this.getMindMaps();
    const mindMap = mindMaps.find(map => map.id === mindMapId);
    
    if (!mindMap) {
      return null;
    }

    return {
      version: '1.0',
      mindMap,
      exportedAt: Date.now(),
    };
  }

  static async importMindMap(exportData: MindMapExport): Promise<MindMap> {
    // Generate new ID to avoid conflicts
    const importedMindMap: MindMap = {
      ...exportData.mindMap,
      id: Date.now().toString(),
      title: exportData.mindMap.title + ' (Imported)',
      updatedAt: Date.now(),
    };

    const mindMaps = await this.getMindMaps();
    mindMaps.unshift(importedMindMap);
    await this.saveMindMaps(mindMaps);
    
    return importedMindMap;
  }

  static async shareMindMapJSON(mindMapId: string): Promise<void> {
    const exportData = await this.exportMindMap(mindMapId);
    if (!exportData) {
      throw new Error('Mind map not found');
    }

    const dataStr = JSON.stringify(exportData, null, 2);
    const fileName = `mindmap-${exportData.mindMap.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, dataStr);
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share Mind Map',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  }

  static async pickAndImportMindMapJSON(): Promise<MindMap> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        throw new Error('User cancelled file selection');
      }

      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const exportData: MindMapExport = JSON.parse(fileContent);
      
      // Validate export data structure
      if (!exportData.mindMap || !exportData.version) {
        throw new Error('Invalid mind map file format');
      }

      return await this.importMindMap(exportData);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to import mind map');
    }
  }
}