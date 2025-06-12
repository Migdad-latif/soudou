import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';

const API_BASE_URL = 'http://192.168.1.214:3000/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children, navigationRef }) => {
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
          const response = await axios.get(`${API_BASE_URL}/auth/me`);
          setUser(response.data.data);
        }
      } catch (e) {
        console.error("Failed to load token or fetch user from SecureStore/backend:", e);
        await SecureStore.deleteItemAsync('userToken');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
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
      console.log("DEBUG (Logout): Attempting to delete userToken from SecureStore...");
      await SecureStore.deleteItemAsync('userToken');
      console.log("DEBUG (Logout): userToken deleted successfully from SecureStore.");
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
      if (navigationRef.current) {
        navigationRef.current.navigate('HomeTab');
      } else {
        console.warn("Navigation ref not available during logout.");
      }
      console.log("User logged out.");
      return { success: true };
    } catch (e) {
      console.error("ERROR (Logout): Failed to delete token from SecureStore:", e);
      setAuthError("Logout failed.");
      return { success: false, error: "Logout failed." };
    }
  };

  // NEW: updatePhoneNumber function to be exposed via context
  const updatePhoneNumber = async (newPhoneNumber, currentPassword) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await axios.put(`${API_BASE_URL}/auth/change-phone`, { currentPassword, newPhoneNumber }, { headers });
      
      // Update user and token in local state (token might change if phone number is in payload)
      await SecureStore.setItemAsync('userToken', response.data.token); // Update token in secure store
      setToken(response.data.token);
      setUser(response.data.user); // Update user object
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`; // Update default header
      return { success: true, message: response.data.message };
    } catch (err) {
      console.error("AuthContext updatePhoneNumber Error:", err.response?.data?.error || err.message);
      return { success: false, error: err.response?.data?.error || "Failed to update phone number." };
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
    // Add updatePhoneNumber to the context value
    <AuthContext.Provider value={{ user, setUser, token, authError, login, register, logout, isLoading, updatePhoneNumber }}>
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