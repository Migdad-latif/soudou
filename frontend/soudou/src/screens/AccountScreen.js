import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function AccountScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account</Text>
      <Text style={styles.placeholderText}>
        Sign in, create account, and app settings will go here.
      </Text>
      <Button title="Sign In (Not functional yet)" onPress={() => console.log('Sign In')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#888',
    marginBottom: 30,
  }
});