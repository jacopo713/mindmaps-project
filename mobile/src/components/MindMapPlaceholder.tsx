import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const MindMapPlaceholder = ({ onBackToChat }: { onBackToChat: () => void }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🗺️ Mappa Concettuale</Text>
        <Text style={styles.subtitle}>
          La funzionalità della mappa concettuale è temporaneamente disabilitata sulla versione mobile.
        </Text>
        <Text style={styles.description}>
          Puoi continuare a usare la chat per conversare con l'AI e creare mappe concettuali tramite la versione web.
        </Text>
        
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBackToChat}
        >
          <Text style={styles.backButtonText}>← Torna alla Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    maxWidth: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MindMapPlaceholder;