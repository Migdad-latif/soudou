import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import axios from 'axios'; // Import Axios

export default function App() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // IMPORTANT: Replace 'YOUR_LOCAL_IP_ADDRESS' with your actual local IP.
  // E.g., 'http://192.168.1.100:3000/api/properties'
  // For Android Emulator, you can use 'http://10.0.2.2:3000/api/properties'
  // For iOS Simulator, 'http://localhost:3000/api/properties' usually works.
  const API_URL = 'http://192.168.1.214:3000/api/properties';

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true); // Set loading to true before fetching
        const response = await axios.get(API_URL);
        setProperties(response.data.data); // Assuming your backend returns { success: true, data: [...] }
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties. Check network and server.');
        // Log specific error details for debugging
        if (err.response) {
          console.error('Response data:', err.response.data);
          console.error('Response status:', err.response.status);
        } else if (err.request) {
          console.error('No response received:', err.request);
        } else {
          console.error('Error setting up request:', err.message);
        }
      } finally {
        setLoading(false); // Set loading to false after fetch attempt
      }
    };

    fetchProperties();
  }, []); // Empty dependency array means this effect runs once after the initial render

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading properties...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (properties.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No properties found. Add some from the backend!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Soudou Properties</Text>
      <FlatList
        data={properties}
        keyExtractor={(item) => item._id} // Use MongoDB's _id as key
        renderItem={({ item }) => (
          <View style={styles.propertyCard}>
            <Text style={styles.propertyTitle}>{item.title}</Text>
            <Text>{item.description}</Text>
            <Text>Price: {item.price} {item.currency}</Text>
            <Text>Type: {item.propertyType} ({item.listingType})</Text>
            <Text>Location: {item.location}</Text>
            {/* Add more details as needed */}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50, // To avoid status bar
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  propertyCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#007bff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  }
});
