import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert, Button, Dimensions, TextInput, Modal } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://192.168.1.214:3000/api';
const ENQUIRIES_API_URL = `${API_BASE_URL}/enquiries`;
const screenWidth = Dimensions.get('window').width;


export default function EnquiriesScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user, token, isLoading: authLoading } = useAuth();

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState('sent'); // 'sent' or 'received'

  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [currentEnquiryToReply, setCurrentEnquiryToReply] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');


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


  const fetchEnquiries = useCallback(async () => {
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
  }, [user, token, viewType]);

  useEffect(() => {
    if (isFocused) {
      fetchEnquiries();
    }
  }, [isFocused, fetchEnquiries]);


  const handleViewEnquiry = async (enquiry) => {
    // Open the reply modal to view full conversation and allow new messages
    setCurrentEnquiryToReply(enquiry);
    setReplyModalVisible(true);
    setReplyMessage(''); // Clear reply message input for new message

    // Mark as read if it's a received enquiry and status is 'sent'
    if (viewType === 'received' && enquiry.status === 'sent' && user?.role === 'agent' && token) {
      try {
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        await axios.patch(`${ENQUIRIES_API_URL}/${enquiry._id}/status`, { status: 'read' }, { headers });
        setEnquiries(prev => prev.map(e => e._id === enquiry._id ? { ...e, status: 'read' } : e));
      } catch (err) {
        console.error("Error marking enquiry as read:", err);
      }
    }
  };


  const handleReplySubmission = async () => {
    if (!replyMessage.trim()) {
      Alert.alert('Missing Message', 'Please type your reply message.');
      return;
    }
    if (!currentEnquiryToReply) return;

    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const response = await axios.post(`${ENQUIRIES_API_URL}/${currentEnquiryToReply._id}/message`, {
        message: replyMessage,
      }, { headers });

      if (response.status === 200) {
        Alert.alert('Success', 'Message sent!');
        setReplyMessage('');
        // Update local state for the replied enquiry (new message added to conversation array)
        // Ensure user ID and name are correctly populated for display in bubbles
        const newMessage = {
          senderId: user.id, // Only ID needed for backend
          message: replyMessage,
          timestamp: new Date(),
          // For frontend display, we need sender's name too.
          // Add a dummy 'name' field for display, it won't be sent to backend.
          sender: { _id: user.id, name: user.name || 'You' } // Add name for display
        };
        setEnquiries(prev => prev.map(e => e._id === currentEnquiryToReply._id ? { ...e, conversation: [...(e.conversation || []), newMessage], status: user.role === 'agent' ? 'replied' : 'open' } : e));
        
      } else {
        Alert.alert('Error', `Failed to send message: ${response.data?.error || 'Please try again.'}`);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert('Error', 'Failed to send message. Please check your network.');
    } finally {
      setLoading(false);
    }
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
      {user?.role === 'agent' && (
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
            <TouchableOpacity style={styles.enquiryCard} onPress={() => handleViewEnquiry(item)}>
              <View style={styles.enquiryCardHeader}>
                <Image
                  source={{ uri: item.property?.photos?.[0] || 'https://placehold.co/100x100/eeeeee/888888?text=No+Image' }}
                  style={styles.propertyThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.enquiryCardHeaderContent}>
                  <Text style={styles.enquiryPropertyTitle}>{item.property?.title || 'Property'}</Text>
                  <Text style={styles.enquiryPropertyLocation}>{item.property?.location || 'Unknown Location'}</Text>
                  <Text style={styles.enquiryDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.enquiryStatus}>
                  <Ionicons
                    name={item.status === 'read' ? 'mail-open' : item.status === 'replied' ? 'chatbubbles' : 'mail'}
                    size={20}
                    color={item.status === 'replied' ? '#00c3a5' : item.status === 'read' ? '#007bff' : '#888'}
                  />
                  {item.status === 'replied' && <Text style={styles.statusText}>Replied</Text>}
                  {item.status === 'read' && <Text style={styles.statusText}>Read</Text>}
                  {item.status === 'sent' && <Text style={styles.statusText}>Sent</Text>}
                </View>
              </View>
              {/* Display all conversation messages */}
              <View style={styles.conversationContainer}>
                {item.conversation?.map((msg, msgIdx) => (
                  <View key={msgIdx} style={[styles.messageBubble, msg.senderId === user?.id ? styles.myMessage : styles.otherMessage]}>
                    <Text style={styles.messageSender}>
                      {/* Check if msg.senderId is equal to user.id or currentEnquiryToReply.recipientAgent.id if not populated */}
                      {msg.senderId === user?.id ? 'You' : msg.senderId?.name || (currentEnquiryToReply?.recipientAgent?.name === msg.senderId?.name ? 'Agent' : 'User')}:
                    </Text>
                    <Text style={styles.messageText}>{msg.message}</Text>
                    <Text style={styles.messageTimestamp}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                ))}
              </View>
              
              {viewType === 'received' && item.sender && (
                <Text style={styles.enquirySender}>Original Sender: {item.sender?.name || 'User'} ({item.sender?.phoneNumber || 'N/A'})</Text>
              )}
              {viewType === 'sent' && item.recipientAgent && (
                <Text style={styles.enquiryRecipient}>Recipient Agent: {item.recipientAgent?.name || 'Agent'} ({item.recipientAgent?.phoneNumber || 'N/A'})</Text>
              )}
              {/* Send Message Button for agents on received, and for users on sent if agent replied */}
              {((viewType === 'received' && user?.role === 'agent') || (viewType === 'sent' && item.status === 'replied')) && (
                <TouchableOpacity style={styles.replyButton} onPress={() => {
                  setCurrentEnquiryToReply(item);
                  setReplyModalVisible(true);
                  setReplyMessage('');
                }}>
                  <Text style={styles.replyButtonText}>Send Message</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
          style={styles.enquiriesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Reply Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={replyModalVisible}
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Message</Text>
            {currentEnquiryToReply && (
              <>
                <Text style={styles.modalSubTitle}>About: {currentEnquiryToReply.property?.title || 'Property'}</Text>
                <Text style={styles.modalOriginalMessage}>Conversation with {viewType === 'received' ? currentEnquiryToReply.sender?.name : currentEnquiryToReply.recipientAgent?.name || 'Agent'}</Text>
              </>
            )}
            <TextInput
              style={styles.modalTextInput}
              multiline
              placeholder="Type your message here..."
              value={replyMessage}
              onChangeText={setReplyMessage}
              maxLength={500}
            />
            <Text style={styles.modalCharCount}>{replyMessage.length}/500}</Text>
            <View style={styles.modalButtonContainer}>
              <Button title="Cancel" onPress={() => {setReplyModalVisible(false); setReplyMessage(''); setCurrentEnquiryToReply(null);}} color="#dc3545" />
              <Button title="Send Message" onPress={handleReplySubmission} color="#00c3a5" disabled={loading} />
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
  enquiryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#666',
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
  // NEW STYLES for conversation thread
  conversationContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  messageBubble: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 5,
    maxWidth: '90%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e6f7ff',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#002f3d',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#444',
  },
  messageTimestamp: {
    fontSize: 10,
    color: '#888',
    textAlign: 'right',
    marginTop: 2,
  },
  replySection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
  },
  replyLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#002f3d',
    marginBottom: 5,
  },
  replyMessage: {
    fontSize: 15,
    color: '#444',
    lineHeight: 20,
  },
  replyDate: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 5,
  },
  enquirySender: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 10,
  },
  enquiryRecipient: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 10,
  },
  replyButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Reused carousel styles (if PropertyImageCarousel is here)
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
  // Styles for Reply Modal (reused from PropertyDetailsScreen)
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  modalSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#555',
  },
  modalSender: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  modalOriginalMessage: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#444',
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#ddd',
    paddingLeft: 10,
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