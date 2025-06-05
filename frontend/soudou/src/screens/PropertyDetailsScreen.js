import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Dimensions, Button } from 'react-native'; // Added Button
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

// IMPORTANT: Make sure this is your correct local IP address and port
const API_URL = 'http://192.168.1.214:3000/api/properties'; // Your computer's local IP

export default function PropertyDetailsScreen() {
  const route = useRoute();
  const { propertyId } = route.params; // Get propertyId passed from HomeScreen

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // --- DIAGNOSTIC LOG ---
        console.log("DEBUG: PropertyDetailsScreen - Received propertyId:", propertyId);
        // --- PROBLEM FIXED HERE: ADDED BACKTICKS ( ` ) ---
        const urlToFetch = `${API_URL}/${propertyId}`; // <-- CHANGED TO BACKTICKS
        console.log("DEBUG: PropertyDetailsScreen - Attempting to fetch URL:", urlToFetch);
        // --- END DIAGNOSTIC LOG ---

        if (!propertyId) {
          throw new Error("Property ID is missing or undefined.");
        }

        const response = await axios.get(urlToFetch); // Use the correctly constructed URL
        setProperty(response.data.data);
      } catch (err) {
        console.error('Error fetching property details:', err);
        setError('Failed to load property details. Check network and ID.');
        if (err.response) {
          console.error('Response data:', err.response.data);
          console.error('Response status:', err.response.status);
        } else if (err.request) {
          console.error('No response received:', err.request);
        } else {
          console.error('Error setting up request:', err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if propertyId is available
    if (propertyId) {
      fetchPropertyDetails();
    } else {
      console.error("Property ID was not provided to PropertyDetailsScreen.");
      setError("No property ID provided. Please return to Home and try again.");
      setLoading(false);
    }
  }, [propertyId]); // Dependency array should include propertyId

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading property details...</Text>
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

  if (!property) {
    return (
      <View style={styles.center}>
        <Text>Property not found or data is empty.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Property Image Carousel (Basic - single image for now) */}
      {property.photos && property.photos.length > 0 ? (
        <Image
          source={{ uri: property.photos[0] }} // Display first image
          style={styles.propertyImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.noImageIcon}>
          <Ionicons name="image-outline" size={80} color="#ccc" />
          <Text style={styles.noImageText}>No Image Available</Text>
        </View>
      )}
      
      <View style={styles.detailsCard}>
        <Text style={styles.price}>
          {property.price.toLocaleString('en-US', { style: 'currency', currency: property.currency || 'GNF' })}
          {property.listingType === 'For Rent' ? ' pcm' : ''} {/* Add 'pcm' for per calendar month */}
        </Text>
        <Text style={styles.address}>{property.location}</Text>
        <Text style={styles.addedDate}>Added: {new Date(property.createdAt).toLocaleDateString()}</Text>

        <View style={styles.quickDetailsRow}>
          <View style={styles.quickDetailItem}>
            <Ionicons name="bed-outline" size={20} color="#333" />
            <Text style={styles.quickDetailText}>{property.bedrooms} Bed</Text>
          </View>
          <View style={styles.quickDetailItem}>
            <Ionicons name="toilet-outline" size={20} color="#333" />
            <Text style={styles.quickDetailText}>{property.bathrooms} Bath</Text>
          </View>
          <View style={styles.quickDetailItem}>
            <Ionicons name="home-outline" size={20} color="#333" />
            <Text style={styles.quickDetailText}>{property.propertyType}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.descriptionText}>{property.description}</Text>
        </View>

        {/* Placeholder for Floorplan, Map, etc. */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Key Features / Details</Text>
          <Text>- Property Type: {property.propertyType}</Text>
          <Text>- Listing Type: {property.listingType}</Text>
          <Text>- Available: {property.isAvailable ? 'Yes' : 'No'}</Text>
          {/* Add more fields here as per your schema */}
        </View>

        {/* Call and Email Buttons (Placeholder) */}
        <View style={styles.contactButtons}>
            <Button title="Call Agent" onPress={() => console.log('Call agent')} color="#007bff" />
            <Button title="Email Agent" onPress={() => console.log('Email agent')} color="#00c3a5" />
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  },
  propertyImage: {
    width: screenWidth,
    height: screenWidth * 0.6, // Aspect ratio
  },
  noImageIcon: {
    width: screenWidth,
    height: screenWidth * 0.6,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#888',
    marginTop: 10,
  },
  detailsCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: -50, // Pulls card up over image a bit
    position: 'relative',
    zIndex: 1,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#002f3d',
    marginBottom: 5,
  },
  address: {
    fontSize: 18,
    color: '#555',
    marginBottom: 10,
  },
  addedDate: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  quickDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 20,
  },
  quickDetailItem: {
    alignItems: 'center',
  },
  quickDetailText: {
    fontSize: 16,
    color: '#333',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#002f3d',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  }
});