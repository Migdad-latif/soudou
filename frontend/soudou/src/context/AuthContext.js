import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
// Removed: import { useNavigation } from '@react-navigation/native'; // No longer needed here

const API_BASE_URL = 'http://192.168.1.214:3000/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// AuthProvider now accepts navigationRef as a prop
export const AuthProvider = ({ children, navigationRef }) => { // <-- navigationRef prop
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const loadStoredToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        if (storedToken) {
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (e) {
        console.error("Failed to load token from SecureStore:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredToken();
  }, []);

  const login = async (phoneNumber, password) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { phoneNumber, password });
      const { token: receivedToken, user: userData } = response.data;

      await SecureStore.setItemAsync('userToken', receivedToken);
      setToken(receivedToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
      return { success: true };
    } catch (err) {
      console.error("Login API Error:", err);
      const errorMsg = err.response?.data?.error || "Login failed. Please check your credentials.";
      setAuthError(errorMsg);
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, phoneNumber, password, role) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, { name, phoneNumber, password, role });
      const { token: receivedToken, user: userData } = response.data;

      await SecureStore.setItemAsync('userToken', receivedToken);
      setToken(receivedToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
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

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
      // Use the navigationRef to navigate after logout
      if (navigationRef.current) { // Check if ref is available
        navigationRef.current.navigate('HomeTab'); // Navigate to a public screen after logout
      } else {
        console.warn("Navigation ref not available during logout.");
      }
      console.log("User logged out.");
      return { success: true };
    } catch (e) {
      console.error("Failed to delete token from SecureStore:", e);
      setAuthError("Logout failed.");
      return { success: false, error: "Logout failed." };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Checking authentication...</Text>
      </View>
    );
  }

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