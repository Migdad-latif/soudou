import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Button, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login, authError, isLoading: authContextLoading } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  const handleLogin = async () => {
    setLoading(true);
    // Add console logs to see what's being sent
    console.log('DEBUG (LoginScreen): Attempting login with Phone:', phoneNumber, 'Password:', password);
    if (!phoneNumber || !password) {
      alert('Please enter both phone number and password.');
      setLoading(false);
      return;
    }
    try {
      const result = await login(phoneNumber, password);
      if (result.success) {
        alert('Login successful!');
        // Navigation is handled by AuthContext if navigationRef is passed
        // Or you can explicitly navigate here if AuthContext doesn't handle it:
        // navigation.navigate('HomeTab'); 
      } else {
        alert(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error("Unexpected error during login process (frontend):", err);
      alert("An unexpected error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authContextLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Checking authentication status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sign In to Soudou</Text>

      {authError && <Text style={styles.authErrorText}>{authError}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Phone Number (e.g., 224620123456)"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        value={phoneNumber} // <-- Ensure value is bound to state
        onChangeText={setPhoneNumber} // <-- Ensure onChangeText updates state
        autoCapitalize="none"
        maxLength={15}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password} // <-- Ensure value is bound to state
        onChangeText={setPassword} // <-- Ensure onChangeText updates state
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading || authContextLoading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <Text style={styles.linkText}>Don't have an account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkButtonText}>Register</Text>
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
  },
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
    marginRight: 5,
  },
  linkButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  authErrorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});