import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Button, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Re-added Picker import (it's used in FiltersScreen so might be there)
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { register, authError } = useAuth();

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user'); // Default to 'user'

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Basic validation
    if (!name || !phoneNumber || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }


    setLoading(true);
    try {
      // Pass the selected role to the register function
      const result = await register(name, phoneNumber, password, role); // <-- Role is passed here
      if (result.success) {
        Alert.alert('Registration successful!', 'You can now sign in with your new account.');
        navigation.navigate('Login');
      } else {
        Alert.alert('Registration Failed', result.error);
      }
    } catch (err) {
      console.error("Unexpected error during registration process:", err);
      Alert.alert("Error", "An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create an Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number (e.g., 224620123456)"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 characters)"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {/* Role Selection Checkboxes */}
      <Text style={styles.roleLabel}>Register as:</Text>
      <View style={styles.roleSelectionContainer}>
        <TouchableOpacity
          style={[styles.roleButton, role === 'user' && styles.activeRoleButton]}
          onPress={() => setRole('user')}
        >
          <Ionicons
            name={role === 'user' ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={role === 'user' ? '#007AFF' : '#666'}
            style={styles.roleIcon}
          />
          <Text style={[styles.roleButtonText, role === 'user' && styles.activeRoleButtonText]}>User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleButton, role === 'agent' && styles.activeRoleButton]}
          onPress={() => setRole('agent')}
        >
          <Ionicons
            name={role === 'agent' ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={role === 'agent' ? '#007AFF' : '#666'}
            style={styles.roleIcon}
          />
          <Text style={[styles.roleButtonText, role === 'agent' && styles.activeRoleButtonText]}>Agent</Text>
        </TouchableOpacity>
      </View>


      {authError && <Text style={styles.errorText}>{authError}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <Text style={styles.linkText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  label: { // Style for label above role buttons
    width: '100%',
    textAlign: 'left',
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
    marginTop: 10,
  },
  // Removed old picker styles if they were still present and not used
  // NEW STYLES FOR ROLE SELECTION
  roleLabel: {
    width: '100%',
    textAlign: 'left',
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
    marginTop: 10,
  },
  roleSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  activeRoleButton: {
    backgroundColor: '#e6f7ff', // Light blue background for active
    borderColor: '#007AFF',
  },
  roleIcon: {
    marginRight: 8,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
  },
  activeRoleButtonText: {
    color: '#007AFF', // Blue text for active
  },
  // END NEW STYLES
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#00c3a5',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  linkText: {
    fontSize: 16,
    color: '#555',
  },
  linkButtonText: {
    fontSize: 16,
    color: '#007bff',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
});