import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert, Button, Dimensions, TextInput, Modal, ScrollView as RNScrollView } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://192.168.1.214:3000/api';
const ENQUIRIES_API_URL = `${API_BASE_URL}/enquiries`;
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;


export default function EnquiriesScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user, token, isLoading: authLoading } = useAuth();

  // Initialize viewType based on user role (agent defaults to received, user to sent)
  const [viewType, setViewType] = useState(user?.role === 'agent' ? 'received' : 'sent');

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [currentEnquiryToReply, setCurrentEnquiryToReply] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');

  const [collapsedStates, setCollapsedStates] = useState({});

  const modalConversationScrollRef = useRef(null);
  const conversationScrollRefs = useRef({});


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
            <TouchableOpacity style={[styles.carouselArrowButton, styles.carouselLeftArrow]} onPress={() => onArrowPress(-1)} activeOpacity={0.7}>
              <Ionicons name="chevron-back-circle" size={36} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.carouselArrowButton, styles.carouselRightArrow]} onPress={() => onArrowPress(1)} activeOpacity={0.7}>
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
      } else {
        if (user.role !== 'agent') {
          Alert.alert('Access Denied', 'Only agents can view received enquiries.');
          setEnquiries([]);
          setLoading(false);
          return;
        }
        response = await axios.get(`${ENQUIRIES_API_URL}/my-received`, { headers });
      }
      setEnquiries(prev => {
        const fetchedEnquiries = response.data.data.map(enq => ({
          ...enq,
          conversation: enq.conversation || []
        }));
        const newCollapsedStates = fetchedEnquiries.reduce((acc, enquiry) => {
          acc[enquiry._id] = true;
          return acc;
        }, {});
        setCollapsedStates(newCollapsedStates);
        return fetchedEnquiries;
      });
      
    } catch (err) {
      console.error("Error fetching enquiries:", err);
      setError('Failed to load enquiries.');
    } finally {
      setLoading(false);
    }
  }, [user, token, viewType]);

  useEffect(() => {
    // This effect ensures viewType is correctly set on user/token change (e.g., login/logout)
    if (user && viewType !== (user.role === 'agent' ? 'received' : 'sent')) {
        setViewType(user.role === 'agent' ? 'received' : 'sent');
    }
    
    if (isFocused) {
      fetchEnquiries();
    }
  }, [isFocused, user, fetchEnquiries]);


  const toggleMessageCollapse = (enquiryId) => {
    setCollapsedStates(prev => ({
      ...prev,
      [enquiryId]: !prev[enquiryId]
    }));
    if (conversationScrollRefs.current[enquiryId] && collapsedStates[enquiryId]) {
      setTimeout(() => {
        conversationScrollRefs.current[enquiryId].scrollToEnd({ animated: true });
      }, 50);
    }
  };


  const handleViewEnquiry = async (enquiry) => {
    toggleMessageCollapse(enquiry._id);

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
      Alert.alert('Missing Message', 'Please type your message.');
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
        setLoading(false);

        const newMessage = {
          senderId: user.id,
          message: replyMessage,
          timestamp: new Date(),
          sender: { _id: user.id, name: user.name || 'You' }
        };
        setEnquiries(prev => prev.map(enq => 
          enq._id === currentEnquiryToReply._id 
            ? { ...enq, conversation: [...(enq.conversation || []), newMessage], status: user.role === 'agent' ? 'replied' : 'open' } 
            : enq
        ));
        
        if (modalConversationScrollRef.current) {
          modalConversationScrollRef.current.scrollToEnd({ animated: true });
        }
        
        setReplyModalVisible(false);
        setCurrentEnquiryToReply(null);

      } else {
        Alert.alert('Error', `Failed to send message: ${response.data?.error || 'Please try again.'}`);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert('Error', 'Failed to send message. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEnquiry = async (enquiryId) => {
  Alert.alert(
    "Delete Enquiry",
    "Are you sure you want to delete this enquiry and its conversation?",
    [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Delete",
        onPress: async () => {
          if (!user || !token) {
            Alert.alert('Authentication Required', 'Please log in to delete messages.');
            return;
          }

          try {
            const headers = { 'Authorization': `Bearer ${token}` };

            // Make request
            const response = await axios.patch(`${ENQUIRIES_API_URL}/${enquiryId}/delete`, {}, { headers });

            console.log('Message deleted:', response.data);

            if (response.status === 200) {
              Alert.alert('Success', 'Enquiry deleted successfully.');
              setEnquiries(prev => prev.filter(enq => enq._id !== enquiryId));
            } else {
              Alert.alert('Error', `Failed to delete enquiry: ${response.data?.error || 'Please try again.'}`);
            }

          } catch (error) {
            console.error('Error deleting message:', error.response?.data?.message || error.message || 'Unknown error');
            Alert.alert('Failed', 'Could not delete the enquiry. Try again later.');
          }
        },
        style: "destructive"
      }
    ]
  );
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

  {/* Toggle (actually single button) shown based on role */}
  {user && (
    <View style={styles.toggleContainer}>
      {user.role !== 'agent' ? (
        // Regular user: show only "Sent"
        <TouchableOpacity
          style={[styles.toggleButton, viewType === 'sent' && styles.activeToggleButton]}
          onPress={() => setViewType('sent')}
        >
          <Text style={[styles.toggleButtonText, viewType === 'sent' && styles.activeToggleButtonText]}>
            Sent
          </Text>
        </TouchableOpacity>
      ) : (
        // Agent: show only "Received"
        <TouchableOpacity
          style={[styles.toggleButton, viewType === 'received' && styles.activeToggleButton]}
          onPress={() => setViewType('received')}
        >
          <Text style={[styles.toggleButtonText, viewType === 'received' && styles.activeToggleButtonText]}>
            Received
          </Text>
        </TouchableOpacity>
      )}
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
            <View style={styles.enquiryCard}>
              {/* Added TouchableOpacity around header for collapse/expand */}
              <TouchableOpacity style={styles.enquiryCardHeaderTouchable} onPress={() => toggleMessageCollapse(item._id)}>
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
              </TouchableOpacity>
              {/* Display all conversation messages - now collapsible */}
              <View style={collapsedStates[item._id] ? styles.collapsedContent : styles.expandedContent}>
                <RNScrollView style={styles.conversationScrollArea} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" 
                  ref={ref => { conversationScrollRefs.current[item._id] = ref; }}
                  onContentSizeChange={(contentWidth, contentHeight) => {
                    if (conversationScrollRefs.current[item._id] && !collapsedStates[item._id]) { // Scroll to end only if expanded
                      conversationScrollRefs.current[item._id].scrollToEnd({ animated: true });
                    }
                  }}
                >
                  <View style={styles.conversationContainer}>
                    {item.conversation?.map((msg, msgIdx) => (
                      <View key={msgIdx} style={[styles.messageBubble, msg.senderId === user?.id ? styles.myMessage : styles.otherMessage]}>
                        <Text style={styles.messageSender}>
                          {msg.senderId === user?.id ? 'You' : (msg.senderId?.name || (item.recipientAgent?._id === msg.senderId ? item.recipientAgent?.name : item.sender?.name || 'User'))}:
                        </Text>
                        <Text style={styles.messageText}>{msg.message}</Text>
                        <Text style={styles.messageTimestamp}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                    ))}
                  </View>
                </RNScrollView>
                {/* Scroll Arrows */}
                {item.conversation && item.conversation.length > 3 && ( // Show if more than 3 messages (to require scrolling)
                  <View style={styles.arrowOverlayContainer}>
                    <TouchableOpacity
                      style={[styles.scrollArrow, styles.scrollArrowUp]}
                      onPress={() => conversationScrollRefs.current[item._id]?.scrollTo({ y: 0, animated: true })}
                    >
                      <Ionicons name="chevron-up-circle" size={28} color="#007bff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.scrollArrow, styles.scrollArrowDown]}
                      onPress={() => conversationScrollRefs.current[item._id]?.scrollToEnd({ animated: true })}
                    >
                      <Ionicons name="chevron-down-circle" size={28} color="#007bff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              {viewType === 'received' && item.sender && (
                <Text style={styles.enquirySender}>From: {item.sender?.name || 'User'} </Text>
              )}
              {viewType === 'sent' && item.recipientAgent && (
                <Text style={styles.enquiryRecipient}>To: {item.recipientAgent?.name || 'Agent'} </Text>
              )}
              {/* Send Message Button for agents on received, and for users on sent if agent replied */}
              {((viewType === 'received' && user?.role === 'agent') || (viewType === 'sent' && item.conversation && item.conversation.length > 1)) && (
                <TouchableOpacity style={styles.replyButton} onPress={() => {
                  setCurrentEnquiryToReply(item);
                  setReplyModalVisible(true);
                  setReplyMessage('');
                }}>
                  <Text style={styles.replyButtonText}>Send Message</Text>
                </TouchableOpacity>
              )}
              {/* Delete Button */}
              {(user?.role === 'admin' || (item.sender?._id === user?.id) || (item.recipientAgent?._id === user?.id)) && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteEnquiry(item._id)}>
                  <Ionicons name="trash-outline" size={20} color="#dc3545" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
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
        onRequestClose={() => {setReplyModalVisible(false); setLoading(false);}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Message</Text>
            {currentEnquiryToReply && (
              <>
                <Text style={styles.modalSubTitle}>About: {currentEnquiryToReply.property?.title || 'Property'}</Text>
                <Text style={styles.modalOriginalMessage}>Conversation with {viewType === 'received' ? currentEnquiryToReply.sender?.name : currentEnquiryToReply.recipientAgent?.name || 'Agent'}</Text>
                <RNScrollView ref={modalConversationScrollRef} style={styles.modalConversationScroll}>
                    {currentEnquiryToReply.conversation?.map((msg, msgIdx) => (
                        <View key={msgIdx} style={[styles.messageBubble, msg.senderId === user?.id ? styles.myMessage : styles.otherMessage]}>
                            <Text style={styles.messageSender}>
                                {msg.senderId === user?.id ? 'You' : (msg.senderId?.name || (currentEnquiryToReply.recipientAgent?._id === msg.senderId ? currentEnquiryToReply.recipientAgent?.name : currentEnquiryToReply.sender?.name || 'User'))}:
                            </Text>
                            <Text style={styles.messageText}>{msg.message}</Text>
                            <Text style={styles.messageTimestamp}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                    ))}
                </RNScrollView>
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
            <Text style={styles.modalCharCount}>{replyMessage.length}/500</Text>
            <View style={styles.modalButtonContainer}>
              <Button title="Cancel" onPress={() => {setReplyModalVisible(false); setReplyMessage(''); setCurrentEnquiryToReply(null); setLoading(false);}} color="#dc3545" />
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
    position: 'relative', // Crucial for absolute positioning of arrows
  },
  enquiryCardHeaderTouchable: { // TouchableOpacity wrapping the header part for collapse/expand
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
    paddingTop: 5,
  },
  collapsedContent: {
    maxHeight: 0,
    overflow: 'hidden',
  },
  expandedContent: {
    maxHeight: 500, // Sufficiently large for conversations to scroll
    overflow: 'visible',
  },
  conversationScrollArea: { // This is the new style for the RNScrollView itself
    maxHeight: 150, // KEY FOR SCROLLING WITHIN THE CARD
    minHeight: 50, // Ensures it has some height even with few messages
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#fafafa',
    marginTop: 5,
    marginBottom: 10,
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
  arrowOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  scrollArrow: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: 4,
    elevation: 4,
    alignSelf: 'flex-end',
  },
  scrollArrowUp: {
    // These styles are handled by arrowOverlayContainer and alignSelf
  },
  scrollArrowDown: {
    // These styles are handled by arrowOverlayContainer and alignSelf
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
  modalConversationScroll: {
    maxHeight: screenHeight * 0.3,
    marginBottom: 15,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 5,
  },
});