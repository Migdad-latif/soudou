import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EnquiriesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Enquiries</Text>
      <Text style={styles.placeholderText}>Manage your property enquiries here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
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
  }
});