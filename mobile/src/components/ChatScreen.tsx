import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Message, Chat } from '../types';
import { ChatAPI } from '../utils/api';
import { ChatAPIXHR } from '../utils/api-xhr';
import { StorageManager } from '../utils/storage';

interface ChatScreenProps {
  currentChat: Chat | null;
  onChatUpdate: (chat: Chat) => void;
}

export default function ChatScreen({ currentChat, onChatUpdate }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>(currentChat?.messages || []);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages);
    }
  }, [currentChat]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !currentChat) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage, assistantMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      abortControllerRef.current = new AbortController();
      
      await ChatAPI.sendMessage(
        [...messages, userMessage],
        (chunk: string) => {
          console.log('Received chunk in ChatScreen:', chunk);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        () => {
          setMessages(prev => {
            const finalMessages = prev.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, isStreaming: false }
                : msg
            );
            // Save to storage
            StorageManager.updateChat(currentChat.id, finalMessages);
            onChatUpdate({ ...currentChat, messages: finalMessages });
            return finalMessages;
          });
        },
        (error: Error) => {
          if (error.name !== 'AbortError') {
            console.error('Error:', error);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessage.id
                  ? { 
                      ...msg, 
                      content: 'Errore nella connessione con il server', 
                      isStreaming: false 
                    }
                  : msg
              )
            );
            Alert.alert('Errore', 'Problema di connessione. Riprova più tardi.');
          }
        },
        abortControllerRef.current.signal
      );
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isUser = message.role === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {message.content}
            {message.isStreaming && <Text style={styles.cursor}>|</Text>}
          </Text>
        </View>
      </View>
    );
  };

  if (!currentChat) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Seleziona o crea una nuova chat per iniziare</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Scrivi il tuo messaggio..."
            multiline
            maxLength={2000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputValue.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? (
              <Text style={styles.sendButtonText}>...</Text>
            ) : (
              <Text style={styles.sendButtonText}>→</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          AI-generated, for reference only
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  avatarText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#000',
  },
  assistantText: {
    color: '#000',
  },
  cursor: {
    color: '#666',
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    paddingBottom: 8,
  },
});