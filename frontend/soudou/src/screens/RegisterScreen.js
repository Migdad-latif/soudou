import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../localization/i18n';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { register, authError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phoneNumber || !password || !confirmPassword) {
      Alert.alert(i18n.t('missingFieldsTitle'), i18n.t('missingFieldsDescription'));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert(i18n.t('invalidEmailTitle'), i18n.t('invalidEmailDescription'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(i18n.t('passwordMismatchTitle'), i18n.t('passwordMismatchDescription'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(i18n.t('passwordTooShortTitle'), i18n.t('passwordTooShortDescription'));
      return;
    }

    setLoading(true);
    try {
      const result = await register(name, email, phoneNumber, password, role);
      if (result.success) {
        Alert.alert(i18n.t('registrationSuccessTitle'), i18n.t('registrationSuccessDescription'));
        navigation.navigate('Login');
      } else {
        Alert.alert(i18n.t('registrationFailedTitle'), result.error);
      }
    } catch (err) {
      console.error("Unexpected error during registration process:", err);
      Alert.alert(i18n.t('unexpectedRegistrationErrorTitle'), i18n.t('unexpectedRegistrationErrorDescription'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={60}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.header}>{i18n.t('createAccount')}</Text>

          <TextInput
            style={styles.input}
            placeholder={i18n.t('fullName')}
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder={i18n.t('email')}
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder={i18n.t('phoneNumberPlaceholder')}
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <TextInput
            style={styles.input}
            placeholder={i18n.t('passwordWithMin')}
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder={i18n.t('confirmPassword')}
            placeholderTextColor="#888"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Text style={styles.roleLabel}>{i18n.t('registerAs')}</Text>
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
              <Text style={[styles.roleButtonText, role === 'user' && styles.activeRoleButtonText]}>{i18n.t('user')}</Text>
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
              <Text style={[styles.roleButtonText, role === 'agent' && styles.activeRoleButtonText]}>{i18n.t('agent')}</Text>
            </TouchableOpacity>
          </View>

          {authError && <Text style={styles.errorText}>{authError}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{i18n.t('register')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>{i18n.t('alreadyHaveAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkButtonText}>{i18n.t('signIn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center'
  },
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
  label: {
    width: '100%',
    textAlign: 'left',
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
    marginTop: 10,
  },
  pickerWrapper: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  picker: {
    flex: 1,
    height: 50,
    color: 'transparent',
  },
  pickerSelectionText: {
    position: 'absolute',
    left: 15,
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    width: '70%',
    textAlign: 'left',
  },
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
    backgroundColor: '#e6f7ff',
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
    color: '#007AFF',
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