import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chat } from '../types';
import { StorageManager } from '../utils/storage';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onChatSelect: (chat: Chat) => void;
  onNewChat: () => void;
  onChatsUpdate: (chats: Chat[]) => void;
}

export default function Sidebar({ 
  chats, 
  currentChatId, 
  onChatSelect, 
  onNewChat, 
  onChatsUpdate 
}: SidebarProps) {
  
  const handleDeleteChat = (chatId: string) => {
    Alert.alert(
      'Elimina Chat',
      'Sei sicuro di voler eliminare questa conversazione?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            await StorageManager.deleteChat(chatId);
            const updatedChats = await StorageManager.getChats();
            onChatsUpdate(updatedChats);
          },
        },
      ]
    );
  };

  const renderChatItem = ({ item: chat }: { item: Chat }) => {
    const isSelected = chat.id === currentChatId;
    
    return (
      <View style={styles.chatItemContainer}>
        <TouchableOpacity
          style={[styles.chatItem, isSelected && styles.selectedChatItem]}
          onPress={() => onChatSelect(chat)}
        >
          <Text 
            style={[styles.chatTitle, isSelected && styles.selectedChatTitle]}
            numberOfLines={2}
          >
            {chat.title}
          </Text>
          <Text style={[styles.chatDate, isSelected && styles.selectedChatDate]}>
            {new Date(chat.updatedAt).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit'
            })}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteChat(chat.id)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tree</Text>
        <TouchableOpacity style={styles.newChatButton} onPress={onNewChat}>
          <Text style={styles.newChatButtonText}>New Chat</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        style={styles.chatsList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fbff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000',
  },
  newChatButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  newChatButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  chatsList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  chatItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  chatItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  selectedChatItem: {
    backgroundColor: '#e0f2fe',
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  selectedChatTitle: {
    color: '#0369a1',
  },
  chatDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  selectedChatDate: {
    color: '#0369a1',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});