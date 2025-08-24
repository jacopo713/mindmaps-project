import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chat, Message } from '../types';

const STORAGE_KEYS = {
  CHATS: 'chats',
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

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CHATS);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}