import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Chat } from './src/types';
import { StorageManager } from './src/utils/storage';
import ChatScreen from './src/components/ChatScreen';
import Sidebar from './src/components/Sidebar';
import MindMapPlaceholder from './src/components/MindMapPlaceholder';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;
const IS_MOBILE = width < 768;

export default function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(!IS_MOBILE);
  const [currentScreen, setCurrentScreen] = useState<'chat' | 'mindmap'>('chat');

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
    // Se la chat corrente è già vuota, non creare una nuova chat
    if (currentChat && currentChat.messages.length === 0) {
      return;
    }
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

  const handleNewMap = () => {
    setCurrentScreen('mindmap');
    if (IS_MOBILE) {
      setSidebarVisible(false);
    }
  };

  const handleBackToChat = () => {
    setCurrentScreen('chat');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <View style={styles.container}>
        {/* Mobile Hamburger Menu - Hide in mindmap mode */}
        {IS_MOBILE && currentScreen === 'chat' && (
          <View style={styles.mobileHeader}>
            <TouchableOpacity 
              style={styles.hamburgerButton} 
              onPress={toggleSidebar}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={styles.hamburgerText}>☰</Text>
            </TouchableOpacity>
            {currentScreen === 'chat' && <Text style={styles.headerTitle}>Nuova chat</Text>}
            <TouchableOpacity 
              style={styles.newChatButton} 
              onPress={handleNewMap}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={styles.newChatText}>🗺️</Text>
            </TouchableOpacity>
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
                onNewMap={handleNewMap}
              />
            </View>
          )}

          {/* Main Content Area */}
          <View style={styles.chatArea}>
            {currentScreen === 'chat' ? (
              <ChatScreen
                currentChat={currentChat}
                onChatUpdate={handleChatUpdate}
              />
            ) : (
              <MindMapPlaceholder onBackToChat={handleBackToChat} />
            )}
          </View>
        </View>

        {/* Mobile Sidebar Modal */}
        {IS_MOBILE && (
          <Modal
            visible={sidebarVisible}
            animationType="none"
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
                  onNewMap={handleNewMap}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mobileHeader: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  hamburgerButton: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  hamburgerText: {
    fontSize: 20,
    color: '#374151',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  newChatButton: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  newChatText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#007AFF',
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
