import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useRef, useCallback for carousel
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Dimensions, Button } from 'react-native'; // <-- Ensure Button is here
import { useNavigation, useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://192.168.1.214:3000/api';
const screenWidth = Dimensions.get('window').width;

export default function SavedScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user, token, isLoading: authLoading } = useAuth();

  const [savedProperties, setSavedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper component for image carousel inside FlatList (reused from HomeScreen)
  const PropertyImageCarousel = ({ photos }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef();

    const onArrowPress = useCallback(
      (direction) => {
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = photos.length - 1; // Wrap around
        else if (newIndex >= photos.length) newIndex = 0; // Wrap around
        setCurrentIndex(newIndex);
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      },
      [currentIndex, photos.length]
    );

    const onScroll = useCallback(
      (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(offsetX / (screenWidth - 24)); // Adjusted for card width
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
        }
      },
      [currentIndex]
    );

    const getItemLayout = useCallback((data, index) => ({ // For FlatList performance
      length: screenWidth - 24,
      offset: (screenWidth - 24) * index,
      index,
    }), []);

    return (
      <View style={styles.carouselWrapper}>
        <FlatList
          ref={flatListRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={photos}
          keyExtractor={(photo, index) => `${photo}-${index}`}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.carouselImage} resizeMode="cover" />
          )}
          style={styles.carouselContainer}
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          initialScrollIndex={currentIndex}
        />
        {photos.length > 1 && ( // Only show arrows if more than one photo
          <>
            <TouchableOpacity style={[styles.arrowButton, styles.leftArrow]} onPress={() => onArrowPress(-1)} activeOpacity={0.7}>
              <Ionicons name="chevron-back-circle" size={36} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.arrowButton, styles.rightArrow]} onPress={() => onArrowPress(1)} activeOpacity={0.7}>
              <Ionicons name="chevron-forward-circle" size={36} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };


  // Fetch saved properties when screen is focused or user/token changes
  useEffect(() => {
    const fetchSavedProperties = async () => {
      if (!user || !token) {
        setSavedProperties([]);
        setLoading(false); // Set loading to false if no user/token
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await axios.get(`${API_BASE_URL}/auth/saved-properties`, { headers });
        setSavedProperties(response.data.data);
      } catch (err) {
        console.error("Error fetching saved properties:", err);
        setError('Failed to load saved properties.');
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) {
      fetchSavedProperties();
    }
  }, [isFocused, user, token]);


  // Toggle Save Property Function (reused from HomeScreen)
  const handleToggleSave = async (propertyId) => {
    if (!user || !token) {
      alert('Please log in to save properties.');
      navigation.navigate('AccountTab', { screen: 'Login' });
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await axios.post(`${API_BASE_URL}/auth/save-property/${propertyId}`, {}, { headers });

      if (response.data.action === 'unsaved') {
        setSavedProperties(prev => prev.filter(prop => prop._id !== propertyId));
        alert('Property unsaved!');
      } else {
        // If property was saved, it means it's newly saved. We don't need to re-fetch
        // the whole list unless it's for display on another screen.
        alert('Property saved!');
      }
    } catch (err) {
      console.error("Error toggling save property:", err);
      alert('Failed to save/unsave property. Please try again.');
    }
  };


  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading saved properties...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.noUserText}>Please log in to view your saved properties.</Text>
        <Button title="Sign In" onPress={() => navigation.navigate('AccountTab', { screen: 'Login' })} color="#007bff" />
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
      <Text style={styles.header}>Saved Properties</Text>

      {savedProperties.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noPropertiesText}>You haven't saved any properties yet.</Text>
          <Button title="Browse Properties" onPress={() => navigation.navigate('HomeTab')} color="#007bff" />
        </View>
      ) : (
        <FlatList
          data={savedProperties}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('HomeTab', { screen: 'PropertyDetails', params: { propertyId: item._id } })} style={styles.propertyCard}>
              {item.photos?.length ? (
                <PropertyImageCarousel photos={item.photos} />
              ) : (
                <View style={styles.noCardImageIcon}>
                  <Ionicons name="image-outline" size={50} color="#ccc" />
                  <Text style={styles.noCardImageText}>No Image</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardLocation}>
                  {item.location?.city || 'Unknown Location'}, {item.location?.country || 'Unknown Country'}
                </Text>
                <Text style={styles.cardPrice}>{item.price.toLocaleString('en-US')} GNF</Text>
                <Text style={styles.cardPropertyType}>
                  {Array.isArray(item.propertyType) && item.propertyType.length > 0
                    ? item.propertyType.join(', ')
                    : item.propertyType || 'Property Type N/A'}
                </Text>
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoText}>
                    Bedrooms: {item.bedrooms || 0} | Bathrooms: {item.bathrooms || 0}
                  </Text>
                </View>
              </View>

              {/* Save/Unsave Heart Icon */}
              {user && ( // Only show if user is logged in
                <TouchableOpacity
                  style={styles.saveIcon}
                  onPress={() => handleToggleSave(item._id)} // Toggle save status
                >
                  <Ionicons
                    name={'heart'} // Always filled heart as it's saved list
                    size={28}
                    color={'#dc3545'} // Always red if displayed here
                  />
                </TouchableOpacity>
              )}
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
    backgroundColor: '#f5f5f5', // Light background
    paddingTop: 50,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  noUserText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  noPropertiesText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 12, // Match card margin
    paddingBottom: 20,
  },
  // Reused styles from HomeScreen for property cards
  propertyCard: {
    marginHorizontal: 0, // No extra margin here, handled by listContent
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#aaa',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  carouselWrapper: {
    position: 'relative',
  },
  carouselContainer: {
    width: screenWidth - 24, // Adjusted for card's marginHorizontal * 2
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  carouselImage: {
    width: screenWidth - 24, // Match carouselContainer width
    height: 180,
  },
  arrowButton: {
    position: 'absolute',
    top: '40%',
    zIndex: 10,
    padding: 5,
  },
  leftArrow: {
    left: 5,
  },
  rightArrow: {
    right: 5,
  },
  noCardImageIcon: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  noCardImageText: {
    color: '#888',
    marginTop: 5,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#222',
  },
  cardLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#007AFF',
  },
  cardPropertyType: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardInfoText: {
    fontSize: 13,
    color: '#555',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cardButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cardButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: 5,
  },
});