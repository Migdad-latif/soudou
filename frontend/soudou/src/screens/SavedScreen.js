import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Dimensions, Button, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import i18n from '../localization/i18n'; // <-- ADD THIS LINE

const API_BASE_URL = 'http://192.168.1.214:3000/api';
const screenWidth = Dimensions.get('window').width;

export default function SavedScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user, token, isLoading: authLoading } = useAuth();

  const [savedProperties, setSavedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal for edit property
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Helper component for image carousel inside FlatList (reused from HomeScreen)
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

    const getItemLayout = useCallback((data, index) => ({
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
        {photos.length > 1 && (
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

  // Fetch properties (saved for users, my properties for agents)
  useEffect(() => {
    const fetchProperties = async () => {
      if (!user || !token) {
        setSavedProperties([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (user.role === 'agent') {
          const headers = { 'Authorization': `Bearer ${token}` };
          const response = await axios.get(`${API_BASE_URL}/properties?agent=${user._id || user.id}`);
          const enriched = response.data.data.map(prop => ({
            ...prop,
            stats: prop.stats || { views: 0, clicks: 0, enquiries: 0 }
          }));
          setSavedProperties(enriched);
        } else {
          const headers = { 'Authorization': `Bearer ${token}` };
          const response = await axios.get(`${API_BASE_URL}/auth/saved-properties`, { headers });
          setSavedProperties(response.data.data);
        }
      } catch (err) {
        setError(i18n.t('failedToLoadProperties') || 'Failed to load properties.');
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) {
      fetchProperties();
    }
  }, [isFocused, user, token]);

  // Toggle Save Property Function (only for normal users)
  const handleToggleSave = async (propertyId) => {
    if (!user || !token) {
      alert(i18n.t('pleaseLoginToSave') || 'Please log in to save properties.');
      navigation.navigate('AccountTab', { screen: 'Login' });
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await axios.post(`${API_BASE_URL}/auth/save-property/${propertyId}`, {}, { headers });

      if (response.data.action === 'unsaved') {
        setSavedProperties(prev => prev.filter(prop => prop._id !== propertyId));
        alert(i18n.t('propertyUnsaved') || 'Property unsaved!');
      } else {
        alert(i18n.t('propertySaved') || 'Property saved!');
      }
    } catch (err) {
      alert(i18n.t('failedToSaveUnsaveProperty') || 'Failed to save/unsave property. Please try again.');
    }
  };

  // Delete property (for agents)
  const handleDeleteProperty = async (propertyId) => {
    Alert.alert(
      i18n.t('deleteProperty') || 'Delete Property',
      i18n.t('deletePropertyConfirmation') || 'Are you sure you want to delete this property? This action cannot be undone.',
      [
        { text: i18n.t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: i18n.t('delete') || 'Delete', style: 'destructive', onPress: async () => {
            try {
              setLoading(true);
              const headers = { 'Authorization': `Bearer ${token}` };
              await axios.delete(`${API_BASE_URL}/properties/${propertyId}`, { headers });
              setSavedProperties(prev => prev.filter(prop => prop._id !== propertyId));
              alert(i18n.t('propertyDeleted') || 'Property deleted!');
            } catch (err) {
              alert(i18n.t('failedToDeleteProperty') || 'Failed to delete property.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Open edit modal for a property
  const handleEditProperty = (property) => {
    setEditForm({ ...property });
    setEditModalVisible(true);
  };

  // Submit edit property (for agents)
  const handleSubmitEdit = async () => {
    if (!editForm.title || !editForm.price || !editForm.location) {
      Alert.alert(i18n.t('missingFields') || 'Missing Fields', i18n.t('titlePriceLocationRequired') || 'Title, Price, and Location are required.');
      return;
    }
    setEditLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const payload = {
        ...editForm,
        price: Number(editForm.price),
        isAvailable: !!editForm.isAvailable,
      };
      await axios.put(`${API_BASE_URL}/properties/${editForm._id}`, payload, { headers });
      setSavedProperties(prev =>
        prev.map(prop => prop._id === editForm._id ? { ...prop, ...payload } : prop)
      );
      setEditModalVisible(false);
      alert(i18n.t('propertyUpdated') || 'Property updated!');
    } catch (err) {
      alert(i18n.t('failedToUpdateProperty') || 'Failed to update property.');
    } finally {
      setEditLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>{i18n.t('loadingProperties') || 'Loading properties...'}</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.noUserText}>{i18n.t('pleaseLoginToViewProperties') || 'Please log in to view your properties.'}</Text>
        <Button title={i18n.t('signIn') || 'Sign In'} onPress={() => navigation.navigate('AccountTab', { screen: 'Login' })} color="#007bff" />
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

  const renderAddPropertyButton = () => (
    <TouchableOpacity style={styles.addPropertyButton} onPress={() => navigation.navigate('HomeTab', { screen: 'AddProperty' })}>
      <Ionicons name="add-circle" size={28} color="#fff" style={{ marginRight: 6 }} />
      <Text style={styles.addPropertyButtonText}>{i18n.t('addProperty') || 'Add Property'}</Text>
    </TouchableOpacity>
  );

  let mainLabel = i18n.t('savedProperties') || "Saved Properties";
  if (user.role === "agent") {
    mainLabel = i18n.t('dashboard') || "Dashboard";
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {mainLabel}
      </Text>

      {user.role === 'agent' && renderAddPropertyButton()}

      {savedProperties.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noPropertiesText}>
            {user.role === 'agent'
              ? i18n.t('noAgentProperties') || "You haven't added any properties yet."
              : i18n.t('noSavedProperties') || "You haven't saved any properties yet."}
          </Text>
          <Button
            title={user.role === 'agent'
              ? i18n.t('addProperty') || "Add Property"
              : i18n.t('browseProperties') || "Browse Properties"}
            onPress={() =>
              user.role === 'agent'
                ? navigation.navigate('HomeTab', { screen: 'AddProperty' })
                : navigation.navigate('HomeTab')
            }
            color="#007bff"
          />
        </View>
      ) : (
        <FlatList
          data={savedProperties}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('HomeTab', { screen: 'PropertyDetails', params: { propertyId: item._id } })
              }
              style={styles.propertyCard}
            >
              {item.photos?.length ? (
                <PropertyImageCarousel photos={item.photos} />
              ) : (
                <View style={styles.noCardImageIcon}>
                  <Ionicons name="image-outline" size={50} color="#ccc" />
                  <Text style={styles.noCardImageText}>{i18n.t('noImage') || 'No Image'}</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardLocation}>
                  {item.location?.city || i18n.t('unknownLocation') || 'Unknown Location'},{' '}
                  {item.location?.country || i18n.t('unknownCountry') || 'Unknown Country'}
                </Text>
                <Text style={styles.cardPrice}>
                  {item.price?.toLocaleString('en-US') || 'N/A'} GNF
                </Text>
                <Text style={styles.cardPropertyType}>
                  {Array.isArray(item.propertyType) && item.propertyType.length > 0
                    ? item.propertyType.join(', ')
                    : item.propertyType || (i18n.t('propertyTypeNA') || 'Property Type N/A')}
                </Text>
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoText}>
                    {i18n.t('bedrooms') || 'Bedrooms'}: {item.bedrooms || 0} | {i18n.t('bathrooms') || 'Bathrooms'}: {item.bathrooms || 0}
                  </Text>
                </View>

                {/* Agent property stats */}
                {user.role === 'agent' && item.stats && (
                  <View style={styles.statsRow}>
                    <View style={styles.statsItem}>
                      <Ionicons name="eye" size={18} color="#888" style={{ marginRight: 2 }} />
                      <Text style={styles.statsValue}>{item.stats.views ?? 0}</Text>
                      <Text style={styles.statsLabel}>{i18n.t('views') || 'Views'}</Text>
                    </View>
                    <View style={styles.statsItem}>
                      <Ionicons name="hand-right-outline" size={18} color="#888" style={{ marginRight: 2 }} />
                      <Text style={styles.statsValue}>{item.stats.clicks ?? 0}</Text>
                      <Text style={styles.statsLabel}>{i18n.t('clicks') || 'Clicks'}</Text>
                    </View>
                    <View style={styles.statsItem}>
                      <Ionicons name="mail-outline" size={18} color="#888" style={{ marginRight: 2 }} />
                      <Text style={styles.statsValue}>{item.stats.enquiries ?? 0}</Text>
                      <Text style={styles.statsLabel}>{i18n.t('enquiries') || 'Enquiries'}</Text>
                    </View>
                  </View>
                )}

                {user.role === 'agent' && (
                  <View style={styles.agentCardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditProperty(item)}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>{i18n.t('edit') || 'Edit'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteProperty(item._id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>{i18n.t('delete') || 'Delete'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Saved/Heart icon and label below the card - only for normal users */}
              {user.role !== 'agent' && (
                <View style={styles.savedLabelWrapper}>
                  <TouchableOpacity
                    style={styles.saveIcon}
                    onPress={() => handleToggleSave(item._id)}
                  >
                    <Ionicons
                      name={'heart'}
                      size={28}
                      color={'#dc3545'}
                    />
                  </TouchableOpacity>
                  <Text style={styles.savedLabelText}>{i18n.t('saved') || 'Saved'}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('editProperty') || 'Edit Property'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={i18n.t('title') || "Title"}
              value={editForm.title || ''}
              onChangeText={text => setEditForm({ ...editForm, title: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder={i18n.t('price') || "Price"}
              value={String(editForm.price || '')}
              onChangeText={text => setEditForm({ ...editForm, price: text })}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              placeholder={i18n.t('location') || "Location"}
              value={editForm.location || ''}
              onChangeText={text => setEditForm({ ...editForm, location: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder={i18n.t('description') || "Description"}
              value={editForm.description || ''}
              onChangeText={text => setEditForm({ ...editForm, description: text })}
              multiline
            />
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  editForm.isAvailable ? styles.checkboxChecked : null,
                ]}
                onPress={() =>
                  setEditForm({ ...editForm, isAvailable: !editForm.isAvailable })
                }
              >
                {editForm.isAvailable && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>{i18n.t('available') || 'Available'}</Text>
            </View>
            <View style={styles.modalActionRow}>
              <Button
                title={i18n.t('cancel') || "Cancel"}
                color="#888"
                onPress={() => setEditModalVisible(false)}
              />
              <Button
                title={editLoading ? (i18n.t('saving') || "Saving...") : (i18n.t('save') || "Save")}
                color="#007bff"
                onPress={handleSubmitEdit}
                disabled={editLoading}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ...styles remain the same as you provided above

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  addPropertyButton: {
    flexDirection: 'row',
    backgroundColor: '#00c3a5',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  addPropertyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  propertyCard: {
    marginHorizontal: 0,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 4,
  },
  statsItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 5,
  },
  statsValue: {
    fontWeight: 'bold',
    marginLeft: 2,
    marginRight: 2,
    color: '#222',
  },
  statsLabel: {
    fontSize: 12,
    color: '#888',
    marginLeft: 2,
  },
  agentCardActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  saveIcon: {
    marginRight: 6,
  },
  savedLabelWrapper: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: 14,
    marginBottom: 10,
  },
  savedLabelText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    width: '90%',
    maxHeight: '85%',
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#222',
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#333',
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#222',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
});