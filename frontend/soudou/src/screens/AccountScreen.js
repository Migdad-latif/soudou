import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      alert('Logged out successfully!');
    } else {
      alert(result.error);
    }
  };

  const handleAddPropertyPress = () => {
    navigation.navigate('HomeTab', { screen: 'AddProperty' }); // Navigate within the HomeTab stack
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account</Text>

      {user ? (
        // User is logged in
        <View style={styles.loggedInCard}>
          <Text style={styles.loggedInHeader}>Welcome, {user.name}!</Text>
          <Text style={styles.loggedInText}>Phone: {user.phoneNumber}</Text>
          {user.email && <Text style={styles.loggedInText}>Email: {user.email}</Text>}
          <Text style={styles.loggedInText}>Role: {user.role}</Text>

          {/* Add Property Button for logged-in users */}
          <TouchableOpacity style={styles.addPropertyButton} onPress={handleAddPropertyPress}>
            <Text style={styles.addPropertyButtonText}>Add New Property</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // User is NOT logged in
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Sign In</Text>
          <Text style={styles.cardDescription}>
            Save properties. Save searches. And set up alerts for when something new hits the market.
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.createAccountLink}>Create an account</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* APP SETTINGS */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>APP SETTINGS</Text>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Privacy settings')}>
          <Text style={styles.optionText}>Privacy settings</Text>
        </TouchableOpacity>
      </View>

      {/* SUPPORT */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>SUPPORT</Text>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Suggest an improvement')}>
          <Text style={styles.optionText}>Suggest an improvement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('FAQs')}>
          <Text style={styles.optionText}>FAQs</Text>
        </TouchableOpacity>
      </View>

      {/* LEGAL */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>LEGAL</Text>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Terms of use')}>
          <Text style={styles.optionText}>Terms of use</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Privacy policy')}>
          <Text style={styles.optionText}>Privacy policy</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.appVersion}>App version 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#002f3d',
  },
  cardDescription: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  signInButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#00c3a5',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createAccountLink: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
    paddingVertical: 5,
  },
  loggedInCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loggedInHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#002f3d',
  },
  loggedInText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  logoutButton: {
    marginTop: 20,
    width: '100%',
    padding: 15,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPropertyButton: { // NEW STYLE
    marginTop: 15,
    width: '100%',
    padding: 15,
    backgroundColor: '#28a745', // Green color
    borderRadius: 8,
    alignItems: 'center',
  },
  addPropertyButtonText: { // NEW STYLE
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  optionButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  appVersion: {
    fontSize: 14,
    color: '#888',
    marginTop: 20,
    marginBottom: 10,
  }
});