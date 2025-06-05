import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// IMPORTANT: Make sure this is your correct local IP address and port
const API_URL = 'http://192.168.1.214:3000/api/properties'; // Your computer's local IP

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ listingType: 'For Sale' });
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    if (isFocused) {
      // Apply filters only if new filters are passed
      if (route.params?.appliedFilters) {
        const applied = route.params.appliedFilters;
        const newFilters = {
          ...applied,
          keyword: applied.keyword || '', // Ensure keyword is part of newFilters
        };
        setFilters(newFilters);
        setSearchKeyword(applied.keyword || ''); // Also update search bar input
        navigation.setParams({ appliedFilters: undefined }); // Clear params after use
      } else if (Object.keys(filters).length === 0 || !filters.listingType) { // Ensure default if no filters at all
        setFilters({ listingType: 'For Sale' });
      }
    }
  }, [isFocused, route.params]); // Depend on focus and route params

  // Second useEffect: Fetch properties when filters state changes
  useEffect(() => {
    // Only fetch if filters are genuinely set (e.g., not initial empty object)
    if (Object.keys(filters).length > 0) {
      fetchProperties(filters);
    }
  }, [filters]); // Depend on filters state


  const fetchProperties = async (currentFilters) => { // Renamed param for clarity
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (currentFilters.listingType) params.listingType = currentFilters.listingType;
      if (currentFilters.minBedrooms) params.bedroomsMin = currentFilters.minBedrooms;
      if (currentFilters.maxBedrooms) params.bedroomsMax = currentFilters.maxBedrooms;
      if (currentFilters.minBathrooms) params.bathroomsMin = currentFilters.minBathrooms;
      if (currentFilters.maxBathrooms) params.bathroomsMax = currentFilters.maxBathrooms;
      if (currentFilters.propertyType && currentFilters.propertyType.length > 0) {
        params.propertyType = currentFilters.propertyType.join(',');
      }
      if (currentFilters.keyword) params.keyword = currentFilters.keyword;


      console.log("Fetching with params:", params); // Log parameters being sent

      const response = await axios.get(API_URL, { params });
      setProperties(response.data.data);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties. Check network and server.');
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

  const handleFilterNavigation = () => {
    // Pass ALL current filter states and keyword to FiltersScreen for pre-population
    navigation.navigate('Filters', {
      selectedListingType: filters.listingType,
      minBedrooms: filters.minBedrooms,
      maxBedrooms: filters.maxBedrooms,
      minBathrooms: filters.minBathrooms,
      maxBathrooms: filters.maxBathrooms,
      propertyType: filters.propertyType,
      keyword: searchKeyword, // Pass the search bar keyword
    });
  };

  const handleHomeTogglePress = (type) => {
    setFilters(prev => ({ ...prev, listingType: type }));
  };

  const handleSearchSubmit = () => {
    // When user submits text, update filters with the new keyword
    setFilters(prev => ({ ...prev, keyword: searchKeyword }));
  };

  // NEW: Function to handle tapping on a property card
  const handlePropertyPress = (propertyId) => {
    navigation.navigate('PropertyDetails', { propertyId }); // Navigate to details screen, pass ID
  };


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

  return (
    <View style={styles.container}>
      <Text style={styles.appHeader}>Soudou</Text>

      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color="#fff" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for homes in Guinea"
          placeholderTextColor="#eee"
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={handleFilterNavigation} style={styles.filterButton}>
          <Ionicons name="options" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, filters.listingType === 'For Sale' && styles.activeToggleButton]}
          onPress={() => handleHomeTogglePress('For Sale')}
        >
          <Text style={[styles.toggleButtonText, filters.listingType === 'For Sale' && styles.activeToggleButtonText]}>For Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, filters.listingType === 'For Rent' && styles.activeToggleButton]}
          onPress={() => handleHomeTogglePress('For Rent')}
        >
          <Text style={[styles.toggleButtonText, filters.listingType === 'For Rent' && styles.activeToggleButtonText]}>To Rent</Text>
        </TouchableOpacity>
      </View>

      {properties.length === 0 ? (
        <View style={styles.center}>
          <Text>No properties found. Add some from the backend!</Text>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item._id}
          // Make the entire property card TouchableOpacity
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handlePropertyPress(item._id)} style={styles.propertyCard}>
              <Text style={styles.propertyTitle}>{item.title}</Text>
              <Text>{item.description}</Text>
              <Text>Price: {item.price} {item.currency}</Text>
              <Text>Type: {item.propertyType} ({item.listingType})</Text>
              <Text>Location: {item.location}</Text>
              {/* Add more details here later */}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50, // To avoid status bar
  },
  appHeader: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#002f3d', // Rightmove dark blue
    marginVertical: 10,
  },
  searchBarContainer: { // New style for the TextInput wrapper
    backgroundColor: '#002f3d',
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15, // Padding inside the bar
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: { // New style for the TextInput itself
    flex: 1, // Takes up available space
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12, // Ensure text input height is good
  },
  filterButton: {
    marginLeft: 10, // Space between input and filter icon
    paddingVertical: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002f3d',
  },
  activeToggleButton: {
    backgroundColor: '#00c3a5',
  },
  activeToggleButtonText: {
    color: '#fff',
  },
  propertyCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
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
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});