import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext'; // Import useAuth context

const API_URL = 'http://192.168.1.214:3000/api/properties';
const API_BASE_URL = 'http://192.168.1.214:3000/api'; // Base URL for auth endpoints
const screenWidth = Dimensions.get('window').width;

const PropertyImageCarousel = ({ photos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef();

  const onArrowPress = useCallback(
    (direction) => {
      let newIndex = currentIndex + direction;
      if (newIndex < 0) newIndex = photos.length - 1;
      else if (newIndex >= photos.length) newIndex = 0;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    },
    [currentIndex, photos.length]
  );

  const onScroll = useCallback(
    (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / (screenWidth - 24)); // Adjusted for SavedScreen card width
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex]
  );

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
        initialScrollIndex={currentIndex}
        getItemLayout={(data, index) => ({
          length: screenWidth - 24,
          offset: (screenWidth - 24) * index,
          index,
        })}
      />

      {/* Arrows always visible in provided code */}
      <TouchableOpacity style={[styles.arrowButton, styles.leftArrow]} onPress={() => onArrowPress(-1)} activeOpacity={0.7}>
        <Ionicons name="chevron-back-circle" size={36} color="rgba(0,0,0,0.5)" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.arrowButton, styles.rightArrow]} onPress={() => onArrowPress(1)} activeOpacity={0.7}>
        <Ionicons name="chevron-forward-circle" size={36} color="rgba(0,0,0,0.5)" />
      </TouchableOpacity>
    </View>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { user, token } = useAuth(); // Access user and token from AuthContext

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ listingType: 'For Sale' });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [savedPropertyIds, setSavedPropertyIds] = useState(new Set()); // NEW: Track saved property IDs


  // --- NEW: Fetch saved properties on user/token change or screen focus ---
  useEffect(() => {
    const fetchSavedProperties = async () => {
      if (!user || !token) {
        setSavedPropertyIds(new Set()); // Clear saved if not logged in
        return;
      }
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await axios.get(`${API_BASE_URL}/auth/saved-properties`, { headers });
        const savedIds = new Set(response.data.data.map(prop => prop._id));
        setSavedPropertyIds(savedIds);
      } catch (err) {
        console.error("Error fetching saved properties:", err);
      }
    };

    if (isFocused) { // Fetch when screen focused
      fetchSavedProperties();
    }
  }, [isFocused, user, token]); // Dependencies


  useEffect(() => {
    if (!isFocused) return; // Prevent re-fetching when not focused

    if (route.params?.appliedFilters) {
      const { appliedFilters } = route.params;
      setFilters({
        ...appliedFilters,
        keyword: appliedFilters.keyword || '',
      });
      setSearchKeyword(appliedFilters.keyword || '');
      navigation.setParams({ appliedFilters: undefined });
    } else if (!filters.listingType) {
      setFilters({ listingType: 'For Sale' });
    }
  }, [isFocused, route.params, navigation, filters.listingType]);

  useEffect(() => {
    if (Object.keys(filters).length === 0) return;

    const fetchProperties = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = {};
        if (filters.listingType) params.listingType = filters.listingType;
        if (filters.minBedrooms) params.bedroomsMin = filters.minBedrooms;
        if (filters.maxBedrooms) params.maxBedrooms = filters.maxBedrooms;
        if (filters.minBathrooms) params.bathroomsMin = filters.minBathrooms;
        if (filters.maxBathrooms) params.maxBathrooms = filters.maxBathrooms;
        if (Array.isArray(filters.propertyType) && filters.propertyType.length > 0) {
          params.propertyType = filters.propertyType.join(',');
        }
        if (filters.keyword) params.keyword = filters.keyword;

        console.log('Fetching with params:', params);

        const response = await axios.get(API_URL, { params });
        setProperties(response.data.data);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties. Check network and server.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [filters]);

  const handleFilterNavigation = () => {
    navigation.navigate('Filters', {
      selectedListingType: filters.listingType,
      minBedrooms: filters.minBedrooms,
      maxBedrooms: filters.maxBedrooms,
      minBathrooms: filters.minBathrooms,
      maxBathrooms: filters.maxBathrooms,
      propertyType: filters.propertyType,
      keyword: searchKeyword,
    });
  };

  const handleTogglePress = (type) => {
    setFilters((prev) => ({ ...prev, listingType: type }));
  };

  const handleSearchSubmit = () => {
    setFilters((prev) => ({ ...prev, keyword: searchKeyword }));
  };

  const handlePropertyPress = (propertyId) => {
    navigation.navigate('PropertyDetails', { propertyId });
  };

  // --- NEW: Toggle Save Property Function ---
  const handleToggleSave = async (propertyId) => {
    if (!user || !token) {
      alert('Please log in to save properties.');
      navigation.navigate('AccountTab', { screen: 'Login' });
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await axios.post(`${API_BASE_URL}/auth/save-property/${propertyId}`, {}, { headers }); // Empty body for POST

      if (response.data.action === 'saved') {
        setSavedPropertyIds((prev) => new Set(prev).add(propertyId));
        alert('Property saved!');
      } else {
        setSavedPropertyIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });
        alert('Property unsaved!');
      }
    } catch (err) {
      console.error("Error toggling save property:", err);
      alert('Failed to save/unsave property. Please try again.');
    }
  };
  // --- END NEW: Toggle Save Property Function ---


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
      {/* Header */}
      <View style={styles.headerContainer}>
        <Image source={require('../../assets/soudou-logo.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.appHeader}>Soudou</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color="#333" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for homes in Guinea"
          placeholderTextColor="#666"
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={handleFilterNavigation} style={styles.filterButton}>
          <Ionicons name="options" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Listing Type Toggle */}
      <View style={styles.toggleContainer}>
        {['For Sale', 'For Rent'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.toggleButton, filters.listingType === type && styles.activeToggleButton]}
            onPress={() => handleTogglePress(type)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                filters.listingType === type && styles.activeToggleButtonText,
              ]}
            >
              {type === 'For Sale' ? 'For Sale' : 'To Rent'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Property List */}
      {properties.length === 0 ? (
        <View style={styles.center}>
          <Text>No properties found. Add some from the backend!</Text>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handlePropertyPress(item._id)} style={styles.propertyCard}>
              {item.photos?.length ? (
                <PropertyImageCarousel photos={item.photos} />
              ) : (
                <View style={styles.noCardImageIcon}>
                  <Ionicons name="image-outline" size={50} color="#ccc" />
                  <Text>No Image</Text>
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

              {/* NEW: Save/Unsave Heart Icon */}
              {user && ( // Only show if user is logged in
                <TouchableOpacity
                  style={styles.saveIcon}
                  onPress={() => handleToggleSave(item._id)}
                >
                  <Ionicons
                    name={savedPropertyIds.has(item._id) ? 'heart' : 'heart-outline'}
                    size={28}
                    color={savedPropertyIds.has(item._id) ? '#dc3545' : '#888'} // Red if saved, grey if not
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
  container: { flex: 1, backgroundColor: '#f5f5f5' }, // Light background
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' }, // Light background
  errorText: { color: 'red', fontWeight: 'bold' },

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff', // Light background
  },
  headerLogo: { width: 45, height: 45, marginRight: 8 },
  appHeader: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#002f3d', // Rightmove dark blue
    marginLeft: 10,
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ccc', // Lighter border
    borderRadius: 12,
    backgroundColor: '#fff', // Light background
  },
  searchIcon: { marginRight: 8, color: '#333' }, // Dark text
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    color: '#000', // Dark text
  },
  filterButton: {
    marginLeft: 10,
  },

  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc', // Lighter border
    marginHorizontal: 6,
    backgroundColor: '#f5f5f5', // Light background
  },
  activeToggleButton: {
    backgroundColor: '#00c3a5', // Rightmove green
    borderColor: '#00c3a5',
  },
  toggleButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#444', // Dark text
  },
  activeToggleButtonText: {
    color: '#fff', // White text
  },

  listContent: {
    paddingBottom: 20,
  },
  propertyCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff', // Light card background
    shadowColor: '#aaa',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
    position: 'relative', // Needed for absolute positioning of save icon
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
    backgroundColor: '#eee', // Lighter placeholder background
    borderRadius: 10,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
    color: '#222', // Dark text
  },
  cardLocation: {
    fontSize: 14,
    color: '#666', // Darker grey text
    marginBottom: 6,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#007AFF', // Rightmove blue accent
  },
  cardPropertyType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#007AFF', // Rightmove blue accent
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardInfoText: {
    fontSize: 13,
    color: '#555', // Grey text
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cardButton: {
    backgroundColor: '#007AFF', // Rightmove blue accent
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cardButtonText: {
    color: '#fff', // White text
    fontWeight: 'bold',
  },
  saveIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.7)', // Slightly transparent white background
    borderRadius: 20,
    padding: 5,
  },
});