import React, { useState, useEffect } from 'react'; // Added useEffect
import { View, Text, StyleSheet, TouchableOpacity, Button, FlatList, ActivityIndicator } from 'react-native'; // Added FlatList, ActivityIndicator
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Import useAuth context

// IMPORTANT: Make sure this is your correct local IP address and port
const API_BASE_URL = 'http://192.168.1.214:3000/api';

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, token, logout, isLoading: authLoading } = useAuth(); // Get user, token, logout, authLoading from context

  const [agentProperties, setAgentProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState(null);

  // useEffect to fetch agent's properties if the user is an agent and logged in
  useEffect(() => {
    const fetchAgentProperties = async () => {
      // Only fetch if user is defined, is an agent, and has a token
      if (!user || user.role !== 'agent' || !token) {
        setAgentProperties([]); // Clear properties if conditions not met
        return;
      }

      setPropertiesLoading(true);
      setPropertiesError(null);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await axios.get(`${API_BASE_URL}/properties/myproperties`, { headers });
        setAgentProperties(response.data.data);
      } catch (err) {
        console.error("Error fetching agent properties:", err);
        setPropertiesError('Failed to load your properties.');
      } finally {
        setPropertiesLoading(false);
      }
    };

    fetchAgentProperties();
  }, [user, token]); // Re-run when user or token changes (e.g., after login/logout)


  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      alert('Logged out successfully!');
      // navigation is handled by AuthContext now
    } else {
      alert(result.error);
    }
  };

  const handleAddPropertyPress = () => {
    navigation.navigate('HomeTab', { screen: 'AddProperty' }); // Navigate within the HomeTab stack
  };

  // If AuthContext is still loading (checking token on startup), show a simple indicator
  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account</Text>

      {user ? (
        // User is logged in: Show their profile and agent dashboard if applicable
        <View style={styles.loggedInCard}>
          <Text style={styles.loggedInHeader}>Welcome, {user.name}!</Text>
          <Text style={styles.loggedInText}>Phone: {user.phoneNumber}</Text>
          {user.email && <Text style={styles.loggedInText}>Email: {user.email}</Text>}
          <Text style={styles.loggedInText}>Role: {user.role}</Text>

          {/* Agent Dashboard Section */}
          {user.role === 'agent' && (
            <View style={styles.agentDashboardSection}>
              <Text style={styles.sectionHeader}>Your Properties</Text>
              <TouchableOpacity style={styles.addPropertyButton} onPress={handleAddPropertyPress}>
                <Text style={styles.addPropertyButtonText}>Add New Property</Text>
              </TouchableOpacity>

              {propertiesLoading ? (
                <ActivityIndicator size="small" color="#007bff" style={{ marginTop: 10 }} />
              ) : propertiesError ? (
                <Text style={styles.errorText}>{propertiesError}</Text>
              ) : agentProperties.length > 0 ? (
                <FlatList
                  data={agentProperties}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    // Navigate to PropertyDetails for the agent's property
                    <TouchableOpacity style={styles.agentPropertyCard} onPress={() => navigation.navigate('HomeTab', { screen: 'PropertyDetails', params: { propertyId: item._id } })}>
                      <Text style={styles.agentPropertyTitle}>{item.title}</Text>
                      <Text style={styles.agentPropertyLocation}>{item.location}</Text>
                      {/* You can add edit/delete buttons here later */}
                    </TouchableOpacity>
                  )}
                  style={styles.agentPropertiesList}
                  showsVerticalScrollIndicator={false} // Ensure list can scroll if many properties
                />
              ) : (
                <Text style={styles.noPropertiesText}>You haven't added any properties yet.</Text>
              )}
            </View>
          )}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // User is NOT logged in: Show sign-in/register options
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
    backgroundColor: '#f5f5f5', // Light background
    paddingTop: 50,
    alignItems: 'center', // Center content horizontally
  },
  center: { // Used by authLoading state
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333', // Dark text
  },
  card: {
    backgroundColor: '#fff', // Light background
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%', // Adjust width as needed
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
    color: '#002f3d', // Dark text
  },
  cardDescription: {
    fontSize: 16,
    color: '#555', // Darker grey text
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  signInButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#00c3a5', // Rightmove green
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  signInButtonText: {
    color: '#fff', // White text
    fontSize: 18,
    fontWeight: 'bold',
  },
  createAccountLink: {
    fontSize: 16,
    color: '#007bff', // Blue accent
    fontWeight: 'bold',
    paddingVertical: 5,
  },
  loggedInCard: {
    backgroundColor: '#fff', // Light background
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    width: '90%',
    alignItems: 'flex-start', // Align text to left
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
    color: '#002f3d', // Dark text
  },
  loggedInText: {
    fontSize: 16,
    color: '#555', // Darker grey text
    marginBottom: 5,
  },
  logoutButton: {
    marginTop: 20,
    width: '100%',
    padding: 15,
    backgroundColor: '#dc3545', // Red for logout
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff', // White text
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPropertyButton: { // Style for Add New Property button
    marginTop: 15,
    width: '100%',
    padding: 15,
    backgroundColor: '#28a745', // Green color
    borderRadius: 8,
    alignItems: 'center',
  },
  addPropertyButtonText: {
    color: '#fff', // White text
    fontSize: 18,
    fontWeight: 'bold',
  },
  agentDashboardSection: { // NEW STYLE for agent dashboard section
    width: '100%',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  agentPropertiesList: { // NEW STYLE for FlatList of agent properties
    maxHeight: 200, // Limit height to make it scrollable
    width: '100%',
    marginTop: 10,
  },
  agentPropertyCard: { // NEW STYLE for individual agent property in dashboard
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  agentPropertyTitle: { // NEW STYLE
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  agentPropertyLocation: { // NEW STYLE
    fontSize: 14,
    color: '#666',
  },
  noPropertiesText: { // NEW STYLE
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
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