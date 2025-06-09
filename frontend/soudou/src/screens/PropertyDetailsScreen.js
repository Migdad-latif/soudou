import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Dimensions, Button, FlatList, TouchableOpacity, Modal, Linking, TextInput, Alert } from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// IMPORTANT: Make sure this is your correct local IP address and port
const API_URL = 'http://192.168.1.214:3000/api/properties';
const API_BASE_URL = 'http://192.168.1.214:3000/api';
const ENQUIRIES_API_URL = `${API_BASE_URL}/enquiries`; // Enquiries API endpoint


export default function PropertyDetailsScreen() {
  const route = useRoute();
  const { propertyId } = route.params;
  const { user, token, logout } = useAuth();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [isPropertySaved, setIsPropertySaved] = useState(false);
  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false); // NEW: State for enquiry modal
  const [enquiryMessage, setEnquiryMessage] = useState(''); // NEW: State for enquiry message

  const carouselRef = useRef(null);
  const fullscreenRef = useRef(null);

  // Default region for the map if property coordinates are not available yet
  const defaultRegion = {
    latitude: 9.5098, // Center of Conakry
    longitude: -13.7123, // Center of Conakry
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };


  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!propertyId) {
          throw new Error('Property ID is missing or undefined.');
        }

        const response = await axios.get(`${API_URL}/${propertyId}`);
        setProperty(response.data.data);
        setCurrentIndex(0);

        if (user && token) {
          try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const savedResponse = await axios.get(`${API_BASE_URL}/auth/saved-properties`, { headers });
            const savedIds = new Set(savedResponse.data.data.map(prop => prop._id));
            setIsPropertySaved(savedIds.has(propertyId));
          } catch (savedErr) {
            console.error("Error checking if property is saved:", savedErr);
            setIsPropertySaved(false);
          }
        }

      } catch (err) {
        console.error('Error fetching property details:', err);
        setError('Failed to load property details. Check network and ID.');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchPropertyDetails();
    } else {
      setError('No property ID provided. Please return to Home and try again.');
      setLoading(false);
    }
  }, [propertyId, user, token]);


  const handleToggleSave = async () => {
    if (!user || !token) {
      Alert.alert('Authentication Required', 'Please log in to save properties.');
      navigation.navigate('AccountTab', { screen: 'Login' });
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await axios.post(`${API_BASE_URL}/auth/save-property/${propertyId}`, {}, { headers });

      if (response.data.action === 'saved') {
        setIsPropertySaved(true);
        Alert.alert('Success', 'Property saved!');
      } else {
        setIsPropertySaved(false);
        Alert.alert('Success', 'Property unsaved!');
      }
    } catch (err) {
      console.error("Error toggling save property:", err);
      Alert.alert('Error', 'Failed to save/unsave property. Please try again.');
    }
  };


  const handleCallAgent = () => {
    if (property?.agent?.phoneNumber) {
      Linking.openURL(`tel:${property.agent.phoneNumber}`);
    } else {
      Alert.alert('Error', 'Agent phone number not available.');
    }
  };

  const handleTextAgent = () => {
    if (property?.agent?.phoneNumber) {
      Linking.openURL(`sms:${property.agent.phoneNumber}`);
    } else {
      Alert.alert('Error', 'Agent phone number not available.');
    }
  };


  // --- NEW: Handle Send Enquiry ---
  const handleSendEnquiry = async () => {
    if (!user || !token) {
      Alert.alert('Authentication Required', 'Please log in to send an enquiry.');
      setEnquiryModalVisible(false); // Close modal if not logged in
      navigation.navigate('AccountTab', { screen: 'Login' });
      return;
    }

    if (!enquiryMessage.trim()) {
      Alert.alert('Missing Message', 'Please type your enquiry message.');
      return;
    }

    setLoading(true); // Show global loading for enquiry submission
    try {
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const response = await axios.post(ENQUIRIES_API_URL, {
        propertyId: propertyId,
        message: enquiryMessage,
      }, { headers });

      if (response.status === 201) {
        Alert.alert('Success', 'Your enquiry has been sent to the agent!');
        setEnquiryMessage(''); // Clear message
        setEnquiryModalVisible(false); // Close modal
      } else {
        Alert.alert('Error', `Failed to send enquiry: ${response.data?.error || 'Please try again.'}`);
      }
    } catch (err) {
      console.error("Error sending enquiry:", err);
      Alert.alert('Error', 'Failed to send enquiry. Please check your network.');
    } finally {
      setLoading(false);
    }
  };
  // --- END NEW: Handle Send Enquiry ---


  // Scroll FlatList to index
  const scrollToIndex = (index, ref) => {
    if (!property || !property.photos || !ref.current) return;

    let newIndex = index;
    if (index < 0) newIndex = 0;
    if (index >= property.photos.length) newIndex = property.photos.length - 1;

    setCurrentIndex(newIndex);

    ref.current.scrollToIndex({ index: newIndex, animated: true });
  };

  // FlatList getItemLayout to fix scrollToIndex error
  const getItemLayout = (_, index) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  });

  // Render arrow buttons
  const renderArrow = (direction, onPress) => {
    const iconName = direction === 'left' ? 'chevron-back' : 'chevron-forward';
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.arrowButton,
          direction === 'left' ? styles.leftArrow : styles.rightArrow,
        ]}
        activeOpacity={0.7}
      >
        <Ionicons name={iconName} size={40} color="rgba(255,255,255,0.9)" />
      </TouchableOpacity>
    );
  };

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

  // Determine the map region based on actual coordinates or fallback to default
  const mapRegion = property.coordinates && property.coordinates.coordinates && property.coordinates.coordinates.length === 2
    ? {
        latitude: property.coordinates.coordinates[1],
        longitude: property.coordinates.coordinates[0],
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : defaultRegion;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Property Image Carousel */}
        {property.photos && property.photos.length > 0 ? (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={property.photos}
              keyExtractor={(photo, index) => photo + index}
              renderItem={({ item: photoUri, index }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setFullscreenVisible(true);
                    setCurrentIndex(index);
                    setTimeout(() => {
                      fullscreenRef.current?.scrollToIndex({
                        index,
                        animated: false,
                      });
                    }, 100);
                  }}
                >
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.carouselImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              getItemLayout={getItemLayout}
              onMomentumScrollEnd={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const index = Math.round(offsetX / screenWidth);
                setCurrentIndex(index);
              }}
            />
            {/* Left Arrow */}
            {currentIndex > 0 && renderArrow('left', () => scrollToIndex(currentIndex - 1, carouselRef))}
            {/* Right Arrow */}
            {currentIndex < property.photos.length - 1 && renderArrow('right', () => scrollToIndex(currentIndex + 1, carouselRef))}
          </View>
        ) : (
          <View style={styles.noImageIcon}>
            <Ionicons name="image-outline" size={80} color="#ccc" />
            <Text style={styles.noImageText}>No Image Available</Text>
          </View>
        )}
        
        <View style={styles.detailsCard}>
          <Text style={styles.price}>
            {property.price.toLocaleString('en-US', { style: 'currency', currency: property.currency || 'GNF' })}
            {property.listingType === 'For Rent' ? ' pcm' : ''}
          </Text>
          <Text style={styles.address}>{property.location}</Text>
          <Text style={styles.addedDate}>Added: {new Date(property.createdAt).toLocaleDateString()}</Text>

          <View style={styles.quickDetailsRow}>
            <View style={styles.quickDetailItem}>
              <Ionicons name="bed-outline" size={20} color="#333" />
              <Text style={styles.quickDetailText}>{property.bedrooms} Bed</Text>
            </View>
            <View style={styles.quickDetailItem}>
              <Ionicons name="toilet" size={20} color="#333" />
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

          {/* Map View */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Approximate Location</Text>
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
            >
              <UrlTile
                urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }}
                title={property.title}
                description={property.location}
              />
            </MapView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Key Features / Details</Text>
            <Text>- Property Type: {property.propertyType}</Text>
            <Text>- Listing Type: {property.listingType}</Text>
            <Text>- Bedrooms: {property.bedrooms}</Text>
            <Text>- Bathrooms: {property.bathrooms}</Text>
            <Text>- Living Rooms: {property.livingRooms}</Text>
            <Text>- Contact: {property.contactName}</Text>
            <Text>- Available: {property.isAvailable ? 'Yes' : 'No'}</Text>
          </View>

          <View style={styles.contactButtons}>
              <Button title="Call Agent" onPress={handleCallAgent} color="#007bff" />
              <Button title="Text Agent" onPress={handleTextAgent} color="#00c3a5" />
          </View>
          {/* NEW: Enquire Button */}
          {user && ( // Only show if user is logged in
            <TouchableOpacity style={styles.enquireButton} onPress={() => setEnquiryModalVisible(true)}>
              <Text style={styles.enquireButtonText}>Send Enquiry</Text>
            </TouchableOpacity>
          )}


          {/* Save/Unsave Heart Icon */}
          {user && ( // Only show if user is logged in
            <TouchableOpacity
              style={styles.saveIcon}
              onPress={handleToggleSave}
            >
              <Ionicons
                name={isPropertySaved ? 'heart' : 'heart-outline'}
                size={28}
                color={isPropertySaved ? '#dc3545' : '#888'}
              />
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* Fullscreen Modal Carousel */}
      <Modal visible={fullscreenVisible} transparent={false} animationType="slide" onRequestClose={() => setFullscreenVisible(false)}>
        <View style={styles.fullscreenContainer}>
          <FlatList
            ref={fullscreenRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={property.photos}
            keyExtractor={(photo, index) => photo + index}
            renderItem={({ item: photoUri }) => (
              <Image source={{ uri: photoUri }} style={styles.fullscreenImage} resizeMode="contain" />
            )}
            getItemLayout={getItemLayout}
            initialScrollIndex={currentIndex}
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / screenWidth);
              setCurrentIndex(index);
            }}
          />

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={() => setFullscreenVisible(false)} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>

          {/* Left Arrow */}
          {currentIndex > 0 && renderArrow('left', () => scrollToIndex(currentIndex - 1, fullscreenRef))}

          {/* Right Arrow */}
          {currentIndex < property.photos.length - 1 && renderArrow('right', () => scrollToIndex(currentIndex + 1, fullscreenRef))}
        </View>
      </Modal>

      {/* NEW: Enquiry Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={enquiryModalVisible}
        onRequestClose={() => setEnquiryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enquire about this property</Text>
            <TextInput
              style={styles.modalTextInput}
              multiline
              placeholder="Type your message here..."
              value={enquiryMessage}
              onChangeText={setEnquiryMessage}
              maxLength={500}
            />
            <Text style={styles.modalCharCount}>{enquiryMessage.length}/500</Text>
            <View style={styles.modalButtonContainer}>
              <Button title="Cancel" onPress={() => setEnquiryModalVisible(false)} color="#dc3545" />
              <Button title="Send Enquiry" onPress={handleSendEnquiry} color="#00c3a5" disabled={loading} />
            </View>
            {loading && <ActivityIndicator size="small" color="#007bff" style={{ marginTop: 10 }} />}
          </View>
        </View>
      </Modal>

    </View>
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
  carouselContainer: {
    height: screenWidth * 0.6,
    position: 'relative',
  },
  carouselImage: {
    width: screenWidth,
    height: screenWidth * 0.6,
  },
  noImageIcon: {
    width: screenWidth,
    height: screenWidth * 0.6,
    backgroundColor: '#eee',
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
    marginTop: -50,
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
  },
  enquireButton: {
    backgroundColor: '#00c3a5', // Rightmove green
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  enquireButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrowButton: {
    position: 'absolute',
    top: '40%',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 10,
    borderRadius: 40,
    zIndex: 10,
  },
  leftArrow: {
    left: 10,
  },
  rightArrow: {
    right: 10,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: screenWidth,
    height: screenHeight,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 20,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
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
  modalOverlay: { // Styles for the enquiry modal
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  modalCharCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginBottom: 15,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
});