import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chat } from '../types';
import { StorageManager } from '../utils/storage';
import { groupChatsByDate } from '../utils/dateUtils';

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onChatSelect: (chat: Chat) => void;
  onNewChat: () => void;
  onChatsUpdate: (chats: Chat[]) => void;
  onNewMap: () => void;
}

export default function Sidebar({ 
  chats, 
  currentChatId, 
  onChatSelect, 
  onNewChat, 
  onChatsUpdate,
  onNewMap
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

  const handleRenameChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      Alert.prompt(
        'Rinomina Chat',
        'Inserisci il nuovo nome per questa conversazione:',
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Salva',
            onPress: async (newTitle) => {
              if (newTitle && newTitle.trim()) {
                await StorageManager.renameChat(chatId, newTitle.trim());
                const updatedChats = await StorageManager.getChats();
                onChatsUpdate(updatedChats);
              }
            },
          },
        ],
        'plain-text',
        chat.title
      );
    }
  };

  const handleLongPress = (chatId: string) => {
    Alert.alert(
      'Azioni Chat',
      'Cosa vuoi fare con questa conversazione?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rinomina',
          onPress: () => handleRenameChat(chatId),
        },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => handleDeleteChat(chatId),
        },
      ]
    );
  };

  const renderChatItem = ({ item: chat }: { item: Chat }) => {
    const isSelected = chat.id === currentChatId;
    
    return (
      <TouchableOpacity
        style={[styles.chatItem, isSelected && styles.selectedChatItem]}
        onPress={() => onChatSelect(chat)}
        onLongPress={() => handleLongPress(chat.id)}
        delayLongPress={500}
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
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tree</Text>
        <TouchableOpacity style={styles.newChatButton} onPress={onNewChat}>
          <Text style={styles.buttonIcon}>💬</Text>
          <Text style={styles.newChatButtonText}>New Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.newMapButton} onPress={onNewMap}>
          <Text style={styles.buttonIcon}>🗺️</Text>
          <Text style={styles.newMapButtonText}>New Map</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={groupChatsByDate(chats).map(group => ({
          title: group.title,
          data: group.chats,
        }))}
        renderItem={renderChatItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        style={styles.chatsList}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonIcon: {
    fontSize: 16,
  },
  newChatButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  newMapButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  newMapButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  chatsList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingTop: 16,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chatItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
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
});