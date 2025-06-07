// E:\soudou\frontend\soudou\src\components\ImagePickerComponent.js
import React, { useState } from 'react';
import { View, Button, Image, Text, StyleSheet, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

const ImagePickerComponent = () => {
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const selectImage = async () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('Image picker error: ', response.error);
        Alert.alert('Error', 'Could not select image.');
      } else {
        const selectedImage = response.assets?.[0];
        if (selectedImage) {
          setImageUri(selectedImage.uri);
        }
      }
    });
  };

  const uploadImage = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image first.');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg', // Adjust the type if necessary
      name: 'image.jpg', // You can generate a dynamic name
    });

    // IMPORTANT: Replace 'http://localhost:3000' with your actual local IP: http://192.168.1.214:3000
    try {
      const response = await fetch('http://192.168.1.214:3000/api/uploads/image', { // <-- UPDATE URL HERE
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Image uploaded successfully!');
        console.log('Upload result:', result);
      } else {
        Alert.alert('Error', `Image upload failed. ${result.error || 'Please check the server logs.'}`);
        console.error('Upload error:', result);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to connect to the server.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <Text>No image selected</Text>
      )}
      <Button title="Select Image" onPress={selectImage} />
      <Button title="Upload Image" onPress={uploadImage} disabled={uploading} />
      {uploading && <Text>Uploading...</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
});

export default ImagePickerComponent;