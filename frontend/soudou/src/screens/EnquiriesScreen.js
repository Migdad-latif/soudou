import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert, Button, Dimensions } from 'react-native'; // <-- Ensure Dimensions is here
import { useNavigation, useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://192.168.1.214:3000/api';
const ENQUIRIES_API_URL = `${API_BASE_URL}/enquiries`;
const screenWidth = Dimensions.get('window').width; // For consistent image sizing


export default function EnquiriesScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user, token, isLoading: authLoading } = useAuth();

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState('sent'); // 'sent' or 'received'

  // Helper function for image carousel (reused from HomeScreen) - must be here if used
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
        const newIndex = Math.round(offsetX / (screenWidth - 24)); // Adjusted for SavedScreen card width
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
        }
      },
      [currentIndex]
    );

    const getItemLayout = useCallback((data, index) => ({ // For FlatList performance
      length: screenWidth - 24, // Match carouselImage width
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


  // Fetch enquiries based on viewType (sent or received)
  useEffect(() => {
    const fetchEnquiries = async () => {
      if (!user || !token) {
        setEnquiries([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        let response;
        if (viewType === 'sent') {
          response = await axios.get(`${ENQUIRIES_API_URL}/my-sent`, { headers });
        } else { // viewType === 'received'
          if (user.role !== 'agent') {
            Alert.alert('Access Denied', 'Only agents can view received enquiries.');
            setEnquiries([]);
            setLoading(false);
            return;
          }
          response = await axios.get(`${ENQUIRIES_API_URL}/my-received`, { headers });
        }
        setEnquiries(response.data.data);
      } catch (err) {
        console.error("Error fetching enquiries:", err);
        setError('Failed to load enquiries.');
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) {
      fetchEnquiries();
    }
  }, [isFocused, user, token, viewType]);


  const handlePropertyDetails = (propertyId) => {
    navigation.navigate('HomeTab', { screen: 'PropertyDetails', params: { propertyId } });
  };


  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading enquiries...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.noUserText}>Please log in to view your enquiries.</Text>
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
      <Text style={styles.header}>My Enquiries</Text>

      {/* Toggle between Sent and Received */}
      {user?.role === 'agent' && ( // Only show received toggle for agents, using optional chaining
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, viewType === 'sent' && styles.activeToggleButton]}
            onPress={() => setViewType('sent')}
          >
            <Text style={[styles.toggleButtonText, viewType === 'sent' && styles.activeToggleButtonText]}>Sent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewType === 'received' && styles.activeToggleButton]}
            onPress={() => setViewType('received')}
          >
            <Text style={[styles.toggleButtonText, viewType === 'received' && styles.activeToggleButtonText]}>Received</Text>
          </TouchableOpacity>
        </View>
      )}

      {enquiries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noEnquiriesText}>
            {viewType === 'sent' ? "You haven't sent any enquiries yet." : "You haven't received any enquiries yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={enquiries}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.enquiryCard} onPress={() => handlePropertyDetails(item.property._id)}>
              <View style={styles.enquiryCardHeader}>
                <Image
                  source={{ uri: item.property.photos?.[0] || 'https://placehold.co/100x100/eeeeee/888888?text=No+Image' }}
                  style={styles.propertyThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.enquiryCardHeaderContent}>
                  <Text style={styles.enquiryPropertyTitle}>{item.property.title}</Text>
                  <Text style={styles.enquiryPropertyLocation}>{item.property.location}</Text>
                  <Text style={styles.enquiryDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
              <Text style={styles.enquiryMessage}>{item.message}</Text>
              {viewType === 'received' && item.sender && (
                <Text style={styles.enquirySender}>From: {item.sender.name} ({item.sender.phoneNumber})</Text>
              )}
              {viewType === 'sent' && item.recipientAgent && (
                <Text style={styles.enquiryRecipient}>To: {item.recipientAgent.name || 'Agent'} ({item.recipientAgent.phoneNumber})</Text>
              )}
            </TouchableOpacity>
          )}
          style={styles.enquiriesList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

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
  noUserText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  noEnquiriesText: {
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    paddingVertical: 10,
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
  enquiriesList: {
    paddingHorizontal: 12,
  },
  enquiryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  enquiryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  propertyThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  enquiryCardHeaderContent: {
    flex: 1,
  },
  enquiryPropertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002f3d',
  },
  enquiryPropertyLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  enquiryDate: {
    fontSize: 12,
    color: '#888',
  },
  enquiryMessage: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  enquirySender: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  enquiryRecipient: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: 'bold',
    textAlign: 'right',
  },
});