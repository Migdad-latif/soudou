import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store'; // Import SecureStore for sensitive data
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';

// IMPORTANT: Make sure this is your correct local IP address and port
const API_BASE_URL = 'http://192.168.1.214:3000/api'; // Base URL for your backend API

const AuthContext = createContext();

// Custom hook to easily use authentication context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Stores authenticated user data
  const [token, setToken] = useState(null); // Stores JWT token
  const [isLoading, setIsLoading] = useState(true); // Manages loading state during initial checks
  const [authError, setAuthError] = useState(null); // Stores authentication errors

  useEffect(() => {
    // Function to load token from SecureStore on app startup
    const loadStoredToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        if (storedToken) {
          setToken(storedToken);
          // Optionally decode JWT here to get user info, or fetch /api/auth/me
          // For now, we'll just set the token. User info will be part of login/register response
          // and refetched on /me endpoint when implemented properly.
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`; // Set default auth header
          // Example of fetching user info if token exists (will build /me endpoint later)
          // const response = await axios.get(`${API_BASE_URL}/auth/me`);
          // setUser(response.data.data);
        }
      } catch (e) {
        console.error("Failed to load token from SecureStore:", e);
      } finally {
        setIsLoading(false); // Authentication check finished
      }
    };
    loadStoredToken();
  }, []); // Run once on component mount

  // Login function
  const login = async (phoneNumber, password) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { phoneNumber, password });
      const { token: receivedToken, user: userData } = response.data;

      await SecureStore.setItemAsync('userToken', receivedToken); // Store token securely
      setToken(receivedToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`; // Set default auth header
      return { success: true };
    } catch (err) {
      console.error("Login API Error:", err);
      const errorMsg = err.response?.data?.error || "Login failed. Please check your credentials.";
      setAuthError(errorMsg);
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization']; // Clear header on failure
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (name, phoneNumber, password) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, { name, phoneNumber, password });
      const { token: receivedToken, user: userData } = response.data;

      await SecureStore.setItemAsync('userToken', receivedToken); // Store token securely
      setToken(receivedToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`; // Set default auth header
      return { success: true };
    } catch (err) {
      console.error("Register API Error:", err);
      const errorMsg = err.response?.data?.error || "Registration failed. Please try again.";
      setAuthError(errorMsg);
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken'); // Delete token from secure storage
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization']; // Clear default auth header
      console.log("User logged out.");
      return { success: true };
    } catch (e) {
      console.error("Failed to delete token from SecureStore:", e);
      setAuthError("Logout failed.");
      return { success: false, error: "Logout failed." };
    }
  };

  // Show loading indicator while checking for stored token on app startup
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Checking authentication...</Text>
      </View>
    );
  }

  // Provide auth state and functions to children components
  return (
    <AuthContext.Provider value={{ user, token, authError, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});