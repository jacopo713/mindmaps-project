import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DebugMindMapScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Mind Map</Text>
      <Text>This is a simplified version to test if the app crashes</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default DebugMindMapScreen;