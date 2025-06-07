import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, Platform, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://192.168.1.214:3000/api/properties';
const UPLOAD_API_URL = 'http://192.168.1.214:3000/api/uploads/image';
const MAX_PHOTOS_ALLOWED = 5;

const propertyTypeOptions = ['House', 'Apartment', 'Land', 'Commercial', 'Office'];
const listingTypeOptions = ['For Sale', 'For Rent'];
const numOptionsBedBath = Array.from({ length: 8 }, (_, i) => String(i + 1));
const numOptionsLivingRooms = Array.from({ length: 5 }, (_, i) => String(i));
const bedroomPickerOptions = ['0', ...numOptionsBedBath, '8+'];
const bathroomPickerOptions = ['0', ...numOptionsBedBath, '8+'];

export default function AddPropertyScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();

  const [form, setForm] = useState({
    title: '', description: '', price: '', currency: 'GNF', propertyType: 'House',
    listingType: 'For Sale', bedrooms: '0', bathrooms: '0', livingRooms: '0',
    contactName: '', location: '',
  });
  const [gpsCoords, setGpsCoords] = useState({ latitude: null, longitude: null });
  const [locationMethod, setLocationMethod] = useState('typed');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') Alert.alert('Permission Denied', 'Location permission is needed.');
      let { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== 'granted') Alert.alert('Permission Denied', 'Camera permission is needed.');
      let { status: medLibStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (medLibStatus !== 'granted') Alert.alert('Permission Denied', 'Media library permission is needed.');
    })();
  }, []);

  const updateFormField = useCallback((field, value) => { setForm((prev) => ({ ...prev, [field]: value })); }, []);
  const handleGetLocation = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') { const { status: newStatus } = await Location.requestForegroundPermissionsAsync(); if (newStatus !== 'granted') { Alert.alert('Permission Denied', 'Location permission is required.'); return; } }
      let locationResult = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGpsCoords({ latitude: locationResult.coords.latitude, longitude: locationResult.coords.longitude });
      setLocationMethod('gps');
      let geocodedAddress = await Location.reverseGeocodeAsync({ latitude: locationResult.coords.latitude, longitude: locationResult.coords.longitude });
      if (geocodedAddress?.length) {
        const addr = geocodedAddress[0]; const formattedAddress = [addr.name, addr.street, addr.city, addr.region, addr.country].filter(Boolean).join(', ');
        updateFormField('location', formattedAddress); Alert.alert('Location Captured', `Location: ${formattedAddress}`);
      } else { updateFormField('location', `Lat: ${locationResult.coords.latitude}, Lon: ${locationResult.coords.longitude}`); Alert.alert('Location Captured', 'Could not get address from coordinates.'); }
    } catch (err) { console.error('Error getting location:', err); Alert.alert('Error', 'Failed to get current location. Ensure GPS is enabled.'); setGpsCoords({ latitude: null, longitude: null }); setLocationMethod('typed'); } finally { setLoading(false); }
  }, []);

  const selectOrTakePhoto = () => {
    if (photos.length >= MAX_PHOTOS_ALLOWED) { Alert.alert('Photo Limit Reached', `You can only upload up to ${MAX_PHOTOS_ALLOWED} photos.`); return; }
    Alert.alert('Add Photo', 'Choose an option', [{ text: 'Select from Gallery', onPress: () => handleImagePick(false) }, { text: 'Take Photo', onPress: () => handleImagePick(true) }, { text: 'Cancel', style: 'cancel' },], { cancelable: true });
  };

  const handleImagePick = async (useCamera) => {
    try {
      const options = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7, base64: false, };
      let result;
      if (useCamera) { result = await ImagePicker.launchCameraAsync(options); } else { result = await ImagePicker.launchImageLibraryAsync(options); }
      if (result.canceled) { console.log('User cancelled image picker/camera.'); } else if (result.assets && result.assets.length > 0) { await uploadSelectedImage(result.assets[0]); } else { Alert.alert('Error', `Could not ${useCamera ? 'take photo' : 'select image'}.`); }
    } catch (err) { console.error('Image pick error:', err); Alert.alert('Error', 'Failed to pick image. Ensure permissions are granted in device settings.'); }
  };

  const uploadSelectedImage = async (imageAsset) => {
    setLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: Platform.OS === 'android' ? imageAsset.uri : imageAsset.uri.replace('file://', ''),
        type: imageAsset.mimeType || 'image/jpeg',
        name: imageAsset.fileName || `photo_${Date.now()}.jpg`,
      });

      // --- AGGRESSIVE DEBUGGING HEADERS ---
      // Axios usually sets this automatically, but explicitly defining here
      // and let's try WITHOUT the boundary.
      const headers = {
        'Content-Type': 'multipart/form-data', // This should be enough for Axios
        ...(token && { 'Authorization': `Bearer ${token}` }),
        // 'Accept': 'application/json', // Can add if needed
        // 'Connection': 'Keep-Alive', // Sometimes helps with persistent connections
        // 'Cache-Control': 'no-cache', // Sometimes helps with stale requests
      };
      // --- END AGGRESSIVE DEBUGGING HEADERS ---

      console.log('DEBUG: Attempting image upload with Axios to:', UPLOAD_API_URL);
      // console.log('DEBUG: FormData content:', formData); // Can't log FormData directly

      const response = await axios.post(UPLOAD_API_URL, formData, { headers });

      if (response.status === 200) {
        setPhotos((prev) => [...prev, response.data.data.url]);
        Alert.alert('Success', 'Image uploaded successfully!');
        console.log('Cloudinary URL:', response.data.data.url);
      } else {
        Alert.alert('Error', `Image upload failed: ${response.data?.error || 'Please check the server logs.'}`);
        console.error('Upload error (backend response):', response.data);
      }
    } catch (uploadError) {
      console.error('Upload failed (Axios error):', uploadError);
      const errorMessage = uploadError.response?.data?.error || uploadError.message || 'Network error or server unreachable.';
      Alert.alert('Error', `Failed to upload image: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async () => {
    if (!user || !token) { Alert.alert('Authentication Required', 'Please sign in to add a property.'); navigation.navigate('AccountTab', { screen: 'Login' }); return; }
    const requiredFields = ['title', 'description', 'price', 'location', 'contactName']; for (const field of requiredFields) { if (!form[field]) { Alert.alert('Missing Fields', `Please fill in '${field}' and all other required fields.`); return; } }
    if (photos.length === 0) { Alert.alert('Missing Photos', 'Please upload at least one photo.'); return; }
    if (isNaN(Number(form.price))) { Alert.alert('Invalid Price', 'Please enter a valid number for price.'); return; }

    setLoading(true); setError(null);
    try {
      const propertyData = { ...form, price: Number(form.price), bedrooms: form.bedrooms === '8+' ? 8 : Number(form.bedrooms), bathrooms: form.bathrooms === '8+' ? 8 : Number(form.bathrooms), livingRooms: Number(form.livingRooms), photos, agent: user.id, };
      if (locationMethod === 'gps' && gpsCoords.latitude && gpsCoords.longitude) { propertyData.coordinates = { type: 'Point', coordinates: [gpsCoords.longitude, gpsCoords.latitude], }; }
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, };
      const response = await axios.post(API_URL, propertyData, { headers });

      if (response.status === 201) { Alert.alert('Success', 'Property added successfully!'); clearForm(); promptAddAnother(); } else { setError(response.data.error || 'Failed to add property.'); }
    } catch (err) { console.error('Add property error:', err); setError('Failed to add property. Please try again.'); } finally { setLoading(false); }
  };

  const clearForm = () => {
    setForm({ title: '', description: '', price: '', currency: 'GNF', propertyType: 'House', listingType: 'For Sale', bedrooms: '0', bathrooms: '0', livingRooms: '0', contactName: '', location: '', });
    setPhotos([]); setGpsCoords({ latitude: null, longitude: null }); setLocationMethod('typed'); setError(null);
  };
  const promptAddAnother = () => {
    Alert.alert('Add Another?', 'Would you like to add another property?', [{ text: 'No, Go Home', onPress: () => navigation.navigate('HomeTab'), style: 'cancel' }, { text: 'Yes', onPress: () => {} },], { cancelable: false });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Add Property</Text>
      <Text style={styles.label}>Contact Name *</Text>
      <TextInput style={styles.input} placeholder="Your Name or Agency Name" value={form.contactName} onChangeText={(text) => updateFormField('contactName', text)} />
      <Text style={styles.label}>Location *</Text>
      <View style={styles.locationRow}>
        <TextInput
          style={[styles.input, styles.locationInput]}
          placeholder="e.g., Dixinn, Conakry"
          value={form.location}
          onChangeText={(text) => { updateFormField('location', text); setLocationMethod('typed'); setGpsCoords({ latitude: null, longitude: null }); }}
        />
        <TouchableOpacity onPress={handleGetLocation} style={styles.locationButton}>
          <Ionicons name="locate-outline" size={24} color="#fff" />
          <Text style={styles.locationButtonText}>Get My Location</Text>
        </TouchableOpacity>
      </View>
      {locationMethod === 'gps' && gpsCoords.latitude && gpsCoords.longitude && (
        <Text style={styles.gpsLocationText}>Using GPS: Lat {gpsCoords.latitude.toFixed(4)}, Lon {gpsCoords.longitude.toFixed(4)}</Text>
      )}

      <Text style={styles.label}>Photos (max {MAX_PHOTOS_ALLOWED})</Text>
      <View style={styles.photosContainer}>
        {photos.map((uri, idx) => (<Image key={idx} source={{ uri }} style={styles.photo} />))}
        {photos.length < MAX_PHOTOS_ALLOWED && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={selectOrTakePhoto}>
            <Ionicons name="add" size={30} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} placeholder="Property title" value={form.title} onChangeText={(text) => updateFormField('title', text)} />
      <Text style={styles.label}>Description *</Text>
      <TextInput style={[styles.input, styles.textArea]} placeholder="Description" multiline value={form.description} onChangeText={(text) => updateFormField('description', text)} />
      <Text style={styles.label}>Price *</Text>
      <View style={styles.priceRow}>
        <TextInput style={[styles.input, styles.priceInput]} placeholder="Price" keyboardType="numeric" value={form.price} onChangeText={(text) => updateFormField('price', text)} />
        <Picker selectedValue={form.currency} onValueChange={(value) => updateFormField('currency', value)} style={styles.picker}><Picker.Item label="GNF" value="GNF" /><Picker.Item label="USD" value="USD" /><Picker.Item label="EUR" value="EUR" /></Picker>
      </View>
      <Text style={styles.label}>Property Type</Text>
      <Picker selectedValue={form.propertyType} onValueChange={(value) => updateFormField('propertyType', value)} style={styles.picker}>{propertyTypeOptions.map((type) => (<Picker.Item key={type} label={type} value={type} />))}</Picker>
      <Text style={styles.label}>Listing Type</Text>
      <Picker selectedValue={form.listingType} onValueChange={(value) => updateFormField('listingType', value)} style={styles.picker}>{listingTypeOptions.map((type) => (<Picker.Item key={type} label={type} value={type} />))}</Picker>
      <Text style={styles.label}>Bedrooms</Text>
      <Picker selectedValue={form.bedrooms} onValueChange={(value) => updateFormField('bedrooms', value)} style={styles.picker}>{bedroomPickerOptions.map((num) => (<Picker.Item key={num} label={num} value={num} />))}</Picker>
      <Text style={styles.label}>Bathrooms</Text>
      <Picker selectedValue={form.bathrooms} onValueChange={(value) => updateFormField('bathrooms', value)} style={styles.picker}>{bathroomPickerOptions.map((num) => (<Picker.Item key={num} label={num} value={num} />))}</Picker>
      <Text style={styles.label}>Living Rooms</Text>
      <Picker selectedValue={form.livingRooms} onValueChange={(value) => updateFormField('livingRooms', value)} style={styles.picker}>{numOptionsLivingRooms.map((num) => (<Picker.Item key={num} label={num} value={num} />))}</Picker>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 15 }} />
      ) : (
        <TouchableOpacity style={styles.submitButton} onPress={handleAddProperty}>
          <Text style={styles.submitButtonText}>Add Property</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  priceInput: {
    flex: 2,
    marginRight: 8,
  },
  picker: {
    flex: 1,
    height: 50,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 6,
    color: '#333',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationInput: {
    flex: 1,
  },
  locationButton: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  gpsLocationText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    marginBottom: 10,
    textAlign: 'right',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  photo: {
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#aaa',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
});