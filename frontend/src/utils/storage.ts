import { Chat, Message, MindMap, MindMapExport } from '../types';

const STORAGE_KEYS = {
  CHATS: 'chats',
  MINDMAPS: 'mindmaps',
  CONTEXT_MAPS: 'context_maps'
};

export class StorageManager {
  // Chat management
  static getChats(): Chat[] {
    try {
      const chatsJson = localStorage.getItem(STORAGE_KEYS.CHATS);
      return chatsJson ? JSON.parse(chatsJson) : [];
    } catch (error) {
      console.error('Error loading chats:', error);
      return [];
    }
  }

  static saveChats(chats: Chat[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
    } catch (error) {
      console.error('Error saving chats:', error);
    }
  }

  static createChat(title?: string): Chat {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: title || 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const chats = this.getChats();
    chats.unshift(newChat);
    this.saveChats(chats);
    
    return newChat;
  }

  static updateChat(chatId: string, messages: Message[]): void {
    const chats = this.getChats();
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
      
      this.saveChats(chats);
    }
  }

  static deleteChat(chatId: string): void {
    const chats = this.getChats();
    const filteredChats = chats.filter(chat => chat.id !== chatId);
    this.saveChats(filteredChats);
  }

  static renameChat(chatId: string, newTitle: string): void {
    const chats = this.getChats();
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].title = newTitle.trim();
      chats[chatIndex].updatedAt = Date.now();
      this.saveChats(chats);
    }
  }

  // Clear all data
  static clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CHATS);
      localStorage.removeItem(STORAGE_KEYS.MINDMAPS);
      localStorage.removeItem(STORAGE_KEYS.CONTEXT_MAPS);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  // MindMap management
  static getMindMaps(): MindMap[] {
    try {
      const mindMapsJson = localStorage.getItem(STORAGE_KEYS.MINDMAPS);
      return mindMapsJson ? JSON.parse(mindMapsJson) : [];
    } catch (error) {
      console.error('Error loading mind maps:', error);
      return [];
    }
  }

  static saveMindMaps(mindMaps: MindMap[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MINDMAPS, JSON.stringify(mindMaps));
    } catch (error) {
      console.error('Error saving mind maps:', error);
    }
  }

  static createMindMap(title?: string): MindMap {
    const newMindMap: MindMap = {
      id: Date.now().toString(),
      title: title || 'New Mind Map',
      nodes: [],
      connections: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const mindMaps = this.getMindMaps();
    mindMaps.unshift(newMindMap);
    this.saveMindMaps(mindMaps);
    
    return newMindMap;
  }

  static updateMindMap(mindMapId: string, updatedMindMap: Partial<MindMap>): void {
    const mindMaps = this.getMindMaps();
    const mindMapIndex = mindMaps.findIndex(map => map.id === mindMapId);
    
    if (mindMapIndex !== -1) {
      mindMaps[mindMapIndex] = {
        ...mindMaps[mindMapIndex],
        ...updatedMindMap,
        updatedAt: Date.now(),
      };
      this.saveMindMaps(mindMaps);
    }
  }

  static deleteMindMap(mindMapId: string): void {
    const mindMaps = this.getMindMaps();
    const filteredMindMaps = mindMaps.filter(map => map.id !== mindMapId);
    this.saveMindMaps(filteredMindMaps);
  }

  // Import/Export functionality
  static exportMindMap(mindMapId: string): MindMapExport | null {
    const mindMaps = this.getMindMaps();
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

  static importMindMap(exportData: MindMapExport): MindMap {
    // Generate new ID to avoid conflicts
    const importedMindMap: MindMap = {
      ...exportData.mindMap,
      id: Date.now().toString(),
      title: exportData.mindMap.title + ' (Imported)',
      updatedAt: Date.now(),
    };

    const mindMaps = this.getMindMaps();
    mindMaps.unshift(importedMindMap);
    this.saveMindMaps(mindMaps);
    
    return importedMindMap;
  }

  static downloadMindMapJSON(mindMapId: string): void {
    const exportData = this.exportMindMap(mindMapId);
    if (!exportData) {
      throw new Error('Mind map not found');
    }

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mindmap-${exportData.mindMap.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static uploadMindMapJSON(file: File): Promise<MindMap> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const exportData: MindMapExport = JSON.parse(content);
          
          // Validate export data structure
          if (!exportData.mindMap || !exportData.version) {
            throw new Error('Invalid mind map file format');
          }

          const importedMindMap = this.importMindMap(exportData);
          resolve(importedMindMap);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Context maps for chat
  static getContextMaps(): Array<{ id: string; title: string; json: MindMap }>{
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONTEXT_MAPS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  static upsertContextMap(id: string, title: string, json: MindMap): void {
    const list = this.getContextMaps();
    const idx = list.findIndex(m => m.id === id);
    if (idx >= 0) {
      list[idx] = { id, title, json };
    } else {
      list.push({ id, title, json });
    }
    localStorage.setItem(STORAGE_KEYS.CONTEXT_MAPS, JSON.stringify(list));
  }

  static removeContextMap(id: string): void {
    const list = this.getContextMaps().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.CONTEXT_MAPS, JSON.stringify(list));
  }

  static hasContextMap(id: string): boolean {
    return this.getContextMaps().some(m => m.id === id);
  }

  static pruneContextMaps(validIds: string[]): void {
    try {
      const list = this.getContextMaps();
      const filtered = list.filter(m => validIds.includes(m.id));
      if (filtered.length !== list.length) {
        localStorage.setItem(STORAGE_KEYS.CONTEXT_MAPS, JSON.stringify(filtered));
      }
    } catch (e) {
      // noop
    }
  }
}