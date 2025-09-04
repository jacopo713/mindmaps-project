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
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  // Animation values for dots
  const dot1Opacity = useRef(new Animated.Value(1)).current;
  const dot2Opacity = useRef(new Animated.Value(0.6)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages);
    }
  }, [currentChat]);

  useEffect(() => {
    // Start dots animation when there's a streaming message with no content
    const hasStreamingEmptyMessage = messages.some(m => m.isStreaming && m.content === '');
    
    if (hasStreamingEmptyMessage) {
      const animateDots = () => {
        Animated.sequence([
          Animated.timing(dot1Opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3Opacity, { toValue: 0.6, duration: 400, useNativeDriver: true }),
          Animated.timing(dot1Opacity, { toValue: 0.6, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2Opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2Opacity, { toValue: 0.6, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3Opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          // Repeat animation
          if (messages.some(m => m.isStreaming && m.content === '')) {
            animateDots();
          }
        });
      };
      animateDots();
    }
  }, [messages, dot1Opacity, dot2Opacity, dot3Opacity]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

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
      
      await ChatAPIXHR.sendMessage(
        [...messages, userMessage],
        (chunk: string) => {
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
            
            // Use setTimeout to avoid setState during render
            setTimeout(() => {
              StorageManager.updateChat(currentChat.id, finalMessages);
              onChatUpdate({ ...currentChat, messages: finalMessages });
            }, 0);
            
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
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {isUser ? (
            <Text style={[styles.messageText, styles.userText]}>
              {message.content}
            </Text>
          ) : (
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Markdown style={markdownStyles}>
                {message.content}
              </Markdown>
              {message.isStreaming && message.content === '' && (
                <View style={styles.dotsContainer}>
                  <Animated.Text style={[styles.dot, { opacity: dot1Opacity }]}>•</Animated.Text>
                  <Animated.Text style={[styles.dot, { opacity: dot2Opacity }]}>•</Animated.Text>
                  <Animated.Text style={[styles.dot, { opacity: dot3Opacity }]}>•</Animated.Text>
                </View>
              )}
            </View>
          )}
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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          ListHeaderComponent={messages.length === 0 ? () => (
            <View style={styles.headerContainer}>
              <Text style={styles.treeAiText}>tree.ai</Text>
              <Text style={styles.headerDisclaimer}>AI-generated, for reference only</Text>
            </View>
          ) : null}
        />

        {/* Input */}
        <View style={[styles.inputContainer, { marginBottom: keyboardHeight }]}>
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

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfdfd',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fdfdfd',
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 20,
  },
  treeAiText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  headerDisclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flex: 1,
    flexShrink: 1,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  assistantBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    flex: 1,
    flexShrink: 1,
    paddingHorizontal: 0,
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
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    marginBottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 3,
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
});

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000',
    margin: 0,
    padding: 0,
    flexShrink: 1,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    paddingRight: 0,
    textAlign: 'left',
    flexShrink: 1,
  },
  text: {
    flexShrink: 1,
    textAlign: 'left',
    marginLeft: 0,
    paddingLeft: 0,
  },
  textgroup: {
    flexShrink: 1,
    textAlign: 'left',
    marginLeft: 0,
    paddingLeft: 0,
  },
  softbreak: {
    height: 0,
    width: 0,
  },
  hardbreak: {
    height: 16,
  },
  heading1: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    textAlign: 'left',
  },
  heading2: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 6,
    marginTop: 4,
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    textAlign: 'left',
  },
  heading3: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 4,
    marginTop: 2,
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    textAlign: 'left',
  },
  code_inline: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: 'monospace' as const,
    fontSize: 14,
  },
  code_block: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginVertical: 4,
    fontFamily: 'monospace' as const,
    fontSize: 14,
    flexShrink: 1,
  },
  fence: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginVertical: 4,
    fontFamily: 'monospace' as const,
    fontSize: 14,
    flexShrink: 1,
  },
  list_item: {
    marginBottom: 4,
    marginLeft: 0,
    paddingLeft: 0,
    textAlign: 'left',
  },
  bullet_list: {
    marginBottom: 8,
    marginLeft: 0,
    paddingLeft: 16,
  },
  ordered_list: {
    marginBottom: 8,
    marginLeft: 0,
    paddingLeft: 16,
  },
  strong: {
    fontWeight: 'bold' as const,
  },
  em: {
    fontStyle: 'italic' as const,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#ccc',
    paddingLeft: 12,
    marginVertical: 8,
    fontStyle: 'italic' as const,
    color: '#666',
  },
};