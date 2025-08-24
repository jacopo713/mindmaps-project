import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Chat } from './src/types';
import { StorageManager } from './src/utils/storage';
import ChatScreen from './src/components/ChatScreen';
import Sidebar from './src/components/Sidebar';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;
const IS_MOBILE = width < 768;

export default function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(!IS_MOBILE);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Load local chats
    const chats = await StorageManager.getChats();
    setChats(chats);
    
    // Create first chat if none exist
    if (chats.length === 0) {
      const firstChat = await StorageManager.createChat('New Chat');
      setChats([firstChat]);
      setCurrentChat(firstChat);
    } else {
      setCurrentChat(chats[0]);
    }
  };

  const handleNewChat = async () => {
    const newChat = await StorageManager.createChat();
    setChats(prev => [newChat, ...prev]);
    setCurrentChat(newChat);
  };

  const handleChatSelect = (chat: Chat) => {
    setCurrentChat(chat);
    // Hide sidebar on mobile after selecting chat
    if (IS_MOBILE) {
      setSidebarVisible(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleChatUpdate = (updatedChat: Chat) => {
    setChats(prev => 
      prev.map(chat => 
        chat.id === updatedChat.id ? updatedChat : chat
      )
    );
    setCurrentChat(updatedChat);
  };

  const handleChatsUpdate = (updatedChats: Chat[]) => {
    setChats(updatedChats);
    
    // If current chat was deleted, select first available chat
    const currentChatExists = updatedChats.find(chat => chat.id === currentChat?.id);
    if (!currentChatExists) {
      setCurrentChat(updatedChats.length > 0 ? updatedChats[0] : null);
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <View style={styles.container}>
        {/* Mobile Hamburger Menu */}
        {IS_MOBILE && (
          <View style={styles.mobileHeader}>
            <TouchableOpacity style={styles.hamburgerButton} onPress={toggleSidebar}>
              <Text style={styles.hamburgerText}>☰</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tree</Text>
          </View>
        )}

        <View style={styles.mainContent}>
          {/* Desktop Sidebar */}
          {!IS_MOBILE && sidebarVisible && (
            <View style={styles.sidebar}>
              <Sidebar
                chats={chats}
                currentChatId={currentChat?.id || null}
                onChatSelect={handleChatSelect}
                onNewChat={handleNewChat}
                onChatsUpdate={handleChatsUpdate}
              />
            </View>
          )}

          {/* Main Chat Area */}
          <View style={styles.chatArea}>
            <ChatScreen
              currentChat={currentChat}
              onChatUpdate={handleChatUpdate}
            />
          </View>
        </View>

        {/* Mobile Sidebar Modal */}
        {IS_MOBILE && (
          <Modal
            visible={sidebarVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setSidebarVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.mobileSidebar}>
                <Sidebar
                  chats={chats}
                  currentChatId={currentChat?.id || null}
                  onChatSelect={handleChatSelect}
                  onNewChat={handleNewChat}
                  onChatsUpdate={handleChatsUpdate}
                />
              </View>
              <TouchableOpacity 
                style={styles.modalBackdrop}
                onPress={() => setSidebarVisible(false)}
              />
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mobileHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#f9fbff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  hamburgerText: {
    fontSize: 20,
    color: '#374151',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  chatArea: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileSidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#ffffff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
