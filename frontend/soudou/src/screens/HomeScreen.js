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
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://192.168.1.214:3000/api/properties';
const API_BASE_URL = 'http://192.168.1.214:3000/api';
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
      const newIndex = Math.round(offsetX / (screenWidth - 24));
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
        keyExtractor={(photo, index) => photo ? `${photo}-${index}` : String(index)}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.carouselImage} resizeMode="cover" />
        )}
        style={styles.carouselContainer}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(data, index) => ({
          length: screenWidth - 24,
          offset: (screenWidth - 24) * index,
          index,
        })}
      />

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
  const { user, token, isLoading: authLoading } = useAuth();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ listingType: 'For Sale' });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [savedPropertyIds, setSavedPropertyIds] = useState(new Set());

  // Debug logs for guards and user info
  useEffect(() => {
    console.log('FETCH GUARD:', { isFocused, authLoading, user });
  }, [isFocused, authLoading, user]);

  useEffect(() => {
    const fetchSavedProperties = async () => {
      if (!user || !token) {
        setSavedPropertyIds(new Set());
        return;
      }
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await axios.get(`${API_BASE_URL}/auth/saved-properties`, { headers });
        const savedIds = new Set(response.data.data.map(prop => prop._id));
        setSavedPropertyIds(savedIds);
      } catch (err) {
        // Optional: handle error or ignore
      }
    };

    if (isFocused) {
      fetchSavedProperties();
    }
  }, [isFocused, user, token]);

  // Apply filters from navigation
  useEffect(() => {
    if (!isFocused || authLoading) return;

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
  }, [isFocused, route.params, navigation, filters.listingType, user, authLoading]);

  useEffect(() => {
    if (!isFocused || authLoading) return;
    // Robust agent id check
    const agentId = user && user.role === 'agent' ? (user._id || user.id) : null;
    if (user && user.role === 'agent' && !agentId) return;

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

        // Only add agent if user._id (or user.id) exists
        if (user && user.role === 'agent' && agentId) {
          params.agent = agentId;
        } else {
          params.isAvailable = true;
        }

        const response = await axios.get(API_URL, { params });
        setProperties(response.data.data);
      } catch (err) {
        setError('Failed to load properties. Check network and server.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [filters, user, isFocused, authLoading]);

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

  const handleToggleSave = async (propertyId) => {
    if (!user || !token) {
      alert('Please log in to save properties.');
      navigation.navigate('AccountTab', { screen: 'Login' });
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await axios.post(`${API_BASE_URL}/auth/save-property/${propertyId}`, {}, { headers });

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
      alert('Failed to save/unsave property. Please try again.');
    }
  };

  if (authLoading || loading) {
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
                  {item.location?.city || item.location || 'Unknown Location'}
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
              {user && (
                <TouchableOpacity
                  style={styles.saveIcon}
                  onPress={() => handleToggleSave(item._id)}
                >
                  <Ionicons
                    name={savedPropertyIds.has(item._id) ? 'heart' : 'heart-outline'}
                    size={28}
                    color={savedPropertyIds.has(item._id) ? '#dc3545' : '#888'}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  errorText: { color: 'red', fontWeight: 'bold' },

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  headerLogo: { width: 45, height: 45, marginRight: 8 },
  appHeader: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#002f3d',
    marginLeft: 10,
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  searchIcon: { marginRight: 8, color: '#333' },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    color: '#000',
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
    borderColor: '#ccc',
    marginHorizontal: 6,
    backgroundColor: '#f5f5f5',
  },
  activeToggleButton: {
    backgroundColor: '#00c3a5',
    borderColor: '#00c3a5',
  },
  toggleButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#444',
  },
  activeToggleButtonText: {
    color: '#fff',
  },

  listContent: {
    paddingBottom: 20,
  },
  propertyCard: {
    marginHorizontal: 12,
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
    width: screenWidth - 24,
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  carouselImage: {
    width: screenWidth - 24,
    height: 180,
  },
  arrowButton: {
    position: 'absolute',
    top: '40%',
    zIndex: 10,
    padding: 5,
  },
  leftArrow: {
    left: 6,
  },
  rightArrow: {
    right: 6,
  },

  noCardImageIcon: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '700',
    marginBottom: 4,
    color: '#007AFF',
  },
  cardPropertyType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#007AFF',
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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