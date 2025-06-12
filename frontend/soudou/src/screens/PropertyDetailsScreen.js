import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Dimensions, Button, FlatList, TouchableOpacity, Modal, Linking, TextInput, Alert } from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import i18n from '../localization/i18n';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const API_URL = 'http://192.168.1.214:3000/api/properties';
const API_BASE_URL = 'http://192.168.1.214:3000/api';
const ENQUIRIES_API_URL = `${API_BASE_URL}/enquiries`;

export default function PropertyDetailsScreen() {
  const route = useRoute();
  const { propertyId } = route.params;
  const { user, token, language } = useAuth(); // <--- Use language if provided by your AuthContext

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [isPropertySaved, setIsPropertySaved] = useState(false);
  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [lang, setLang] = useState(i18n.locale);

  const carouselRef = useRef(null);
  const fullscreenRef = useRef(null);

  // Watch for language change to force rerender
  useEffect(() => {
    // If using i18n-js
    const sub = i18n.onChange?.(() => setLang(i18n.locale));
    // If you use a language from context, subscribe to it instead:
    // setLang(language)
    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [language]);

  const defaultRegion = {
    latitude: 9.5098,
    longitude: -13.7123,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const getTranslatedListingType = (listingType) => {
    if (!listingType) return '';
    if (listingType === 'For Sale') return i18n.t('forSale');
    if (listingType === 'For Rent') return i18n.t('forRent');
    return i18n.t(listingType.replace(/\s/g, '').toLowerCase()) || listingType;
  };

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!propertyId) throw new Error('Property ID is missing or undefined.');

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
            setIsPropertySaved(false);
          }
        }

      } catch (err) {
        setError(i18n.t('failedToLoadPropertyDetails') || 'Failed to load property details. Check network and ID.');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchPropertyDetails();
    } else {
      setError(i18n.t('noPropertyIdProvided') || 'No property ID provided. Please return to Home and try again.');
      setLoading(false);
    }
    // Add lang as a dependency so screen re-renders on language change
  }, [propertyId, user, token, lang]);

  const handleToggleSave = async () => {
    if (!user || !token) {
      Alert.alert(i18n.t('authenticationRequired'), i18n.t('loginToSaveProperty'));
      return;
    }
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await axios.post(`${API_BASE_URL}/auth/save-property/${propertyId}`, {}, { headers });
      if (response.data.action === 'saved') {
        setIsPropertySaved(true);
        Alert.alert(i18n.t('success'), i18n.t('propertySaved'));
      } else {
        setIsPropertySaved(false);
        Alert.alert(i18n.t('success'), i18n.t('propertyUnsaved'));
      }
    } catch (err) {
      Alert.alert(i18n.t('error'), i18n.t('failedToSaveUnsaveProperty'));
    }
  };

  const handleCallAgent = () => {
    const agentPhone =
      property?.agent?.phoneNumber ||
      property?.agent?.phone ||
      property?.phoneNumber ||
      property?.contactPhone;

    if (agentPhone) {
      Linking.openURL(`tel:${agentPhone}`);
    } else {
      Alert.alert(i18n.t('error'), i18n.t('agentPhoneNotAvailable'));
    }
  };

  const handleSendEnquiry = async () => {
    if (!user || !token) {
      Alert.alert(i18n.t('authenticationRequired'), i18n.t('loginToSendEnquiry'));
      setEnquiryModalVisible(false);
      return;
    }
    if (!enquiryMessage.trim()) {
      Alert.alert(i18n.t('missingMessage'), i18n.t('typeEnquiryMessage'));
      return;
    }
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const response = await axios.post(ENQUIRIES_API_URL, {
        propertyId: propertyId,
        message: enquiryMessage,
      }, { headers });
      if (response.status === 201) {
        Alert.alert(i18n.t('success'), i18n.t('enquirySent'));
        setEnquiryMessage('');
        setEnquiryModalVisible(false);
      } else {
        Alert.alert(i18n.t('error'), i18n.t('failedToSendEnquiry') + ': ' + (response.data?.error || i18n.t('pleaseTryAgain')));
      }
    } catch (err) {
      Alert.alert(i18n.t('error'), i18n.t('failedToSendEnquiryNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const scrollToIndex = (index, ref) => {
    if (!property || !property.photos || !ref.current) return;
    let newIndex = index;
    if (index < 0) newIndex = 0;
    if (index >= property.photos.length) newIndex = property.photos.length - 1;
    setCurrentIndex(newIndex);
    ref.current.scrollToIndex({ index: newIndex, animated: true });
  };

  const getItemLayout = (_, index) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  });

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
        <Text>{i18n.t('loadingPropertyDetails') || 'Loading property details...'}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{i18n.t('error')}: {error}</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.center}>
        <Text>{i18n.t('propertyNotFound') || 'Property not found or data is empty.'}</Text>
      </View>
    );
  }

  const isAgent =
    user &&
    user.role === 'agent' &&
    property.agent &&
    (property.agent._id === user._id || property.agent === user._id);

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
            <Text style={styles.noImageText}>{i18n.t('noImageAvailable') || 'No Image Available'}</Text>
          </View>
        )}
        
        <View style={styles.detailsCard}>
          <Text style={styles.price}>
            {property.price.toLocaleString('en-US', { style: 'currency', currency: property.currency || 'GNF' })}
            {property.listingType === 'For Rent' ? ' ' + (i18n.t('pcm') || 'pcm') : ''}
          </Text>
          <Text style={styles.address}>{property.location}</Text>
          <Text style={styles.addedDate}>{i18n.t('added') || 'Added'}: {new Date(property.createdAt).toLocaleDateString()}</Text>

          <View style={styles.quickDetailsRow}>
            <View style={styles.quickDetailItem}>
              <Ionicons name="bed-outline" size={20} color="#333" />
              <Text style={styles.quickDetailText}>{property.bedrooms} {i18n.t('bed') || 'Bed'}</Text>
            </View>
            <View style={styles.quickDetailItem}>
              <Ionicons name="toilet" size={20} color="#333" />
              <Text style={styles.quickDetailText}>{property.bathrooms} {i18n.t('bath') || 'Bath'}</Text>
            </View>
            <View style={styles.quickDetailItem}>
              <Ionicons name="home-outline" size={20} color="#333" />
              <Text style={styles.quickDetailText}>{i18n.t(property.propertyType?.toLowerCase())}</Text>
            </View>
            <View style={styles.quickDetailItem}>
              <Ionicons name="pricetag-outline" size={20} color="#333" />
              <Text style={styles.quickDetailText}>{getTranslatedListingType(property.listingType)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{i18n.t('description') || 'Description'}</Text>
            <Text style={styles.descriptionText}>{property.description}</Text>
          </View>

          {/* Map View */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{i18n.t('approximateLocation') || 'Approximate Location'}</Text>
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
            <Text style={styles.sectionHeader}>{i18n.t('keyFeatures') || 'Key Features / Details'}</Text>
            <Text>- {i18n.t('propertyType') || 'Property Type'}: {i18n.t(property.propertyType?.toLowerCase())}</Text>
            <Text>
              - {i18n.t('listingType') || 'Listing Type'}: {getTranslatedListingType(property.listingType)}
            </Text>
            <Text>- {i18n.t('bedrooms') || 'Bedrooms'}: {property.bedrooms}</Text>
            <Text>- {i18n.t('bathrooms') || 'Bathrooms'}: {property.bathrooms}</Text>
            <Text>- {i18n.t('livingRooms') || 'Living Rooms'}: {property.livingRooms}</Text>
            <Text>- {i18n.t('contact') || 'Contact'}: {property.contactName}</Text>
            <Text>- {i18n.t('available') || 'Available'}: {property.isAvailable ? (i18n.t('yes') || 'Yes') : (i18n.t('no') || 'No')}</Text>
          </View>

          {/* Show Call Agent and Send Enquiry for logged-in non-agent users */}
          {!isAgent && user && (
            <>
              <View style={styles.contactButtons}>
                <Button title={i18n.t('callAgent') || "Call Agent"} onPress={handleCallAgent} color="#007bff" />
              </View>
              <TouchableOpacity style={styles.enquireButton} onPress={() => setEnquiryModalVisible(true)}>
                <Text style={styles.enquireButtonText}>{i18n.t('sendEnquiry') || 'Send Enquiry'}</Text>
              </TouchableOpacity>
            </>
          )}
          {/* Show Call Agent for guests */}
          {!isAgent && !user && (
            <View style={styles.contactButtons}>
              <Button title={i18n.t('callAgent') || "Call Agent"} onPress={handleCallAgent} color="#007bff" />
            </View>
          )}
          {/* Agent: show nothing */}

          {/* Save/Unsave Heart Icon */}
          {user && (
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

      {/* Enquiry Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={enquiryModalVisible}
        onRequestClose={() => setEnquiryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('enquireAboutThisProperty') || 'Enquire about this property'}</Text>
            <TextInput
              style={styles.modalTextInput}
              multiline
              placeholder={i18n.t('typeYourMessageHere') || "Type your message here..."}
              value={enquiryMessage}
              onChangeText={setEnquiryMessage}
              maxLength={500}
            />
            <Text style={styles.modalCharCount}>{enquiryMessage.length}/500</Text>
            <View style={styles.modalButtonContainer}>
              <Button title={i18n.t('cancel') || "Cancel"} onPress={() => setEnquiryModalVisible(false)} color="#dc3545" />
              <Button title={i18n.t('sendEnquiry') || "Send Enquiry"} onPress={handleSendEnquiry} color="#00c3a5" disabled={loading} />
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
    backgroundColor: '#00c3a5',
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
  modalOverlay: {
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