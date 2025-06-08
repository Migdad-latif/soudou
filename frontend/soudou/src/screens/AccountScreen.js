import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button, FlatList, ActivityIndicator } from 'react-native'; // Added FlatList, ActivityIndicator
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://192.168.1.214:3000/api';

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, token, logout, isLoading: authLoading } = useAuth();

  const [agentProperties, setAgentProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState(null);

  useEffect(() => {
    const fetchAgentProperties = async () => {
      if (!user || user.role !== 'agent' || !token) {
        setAgentProperties([]);
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
  }, [user, token]);


  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      alert('Logged out successfully!');
    } else {
      alert(result.error);
    }
  };

  const handleAddPropertyPress = () => {
    navigation.navigate('HomeTab', { screen: 'AddProperty' });
  };

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
        <View style={styles.loggedInCard}>
          <Text style={styles.loggedInHeader}>Welcome, {user.name}!</Text>
          <Text style={styles.loggedInText}>Phone: {user.phoneNumber}</Text>
          {user.email && <Text style={styles.loggedInText}>Email: {user.email}</Text>}
          <Text style={styles.loggedInText}>Role: {user.role}</Text>

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
                    <TouchableOpacity style={styles.agentPropertyCard} onPress={() => navigation.navigate('HomeTab', { screen: 'PropertyDetails', params: { propertyId: item._id } })}>
                      <Text style={styles.agentPropertyTitle}>{item.title}</Text>
                      <Text style={styles.agentPropertyLocation}>{item.location}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.agentPropertiesList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <Text style={styles.noPropertiesText}>You haven't added any properties yet.</Text>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
  addPropertyButton: {
    marginTop: 15,
    width: '100%',
    padding: 15,
    backgroundColor: '#28a745',
    borderRadius: 8,
    alignItems: 'center',
  },
  addPropertyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  agentDashboardSection: {
    width: '100%',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  agentPropertiesList: {
    maxHeight: 200,
    width: '100%',
    marginTop: 10,
  },
  agentPropertyCard: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  agentPropertyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  agentPropertyLocation: {
    fontSize: 14,
    color: '#666',
  },
  noPropertiesText: {
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