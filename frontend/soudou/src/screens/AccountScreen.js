import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.214:3000/api';
const CARD_WIDTH = '92%';

function ProfileCard({ user, onEdit }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>Profile</Text>
      <Text style={styles.cardLabel}>Name</Text>
      <Text style={styles.cardValue}>{user?.name || '-'}</Text>
      <Text style={styles.cardLabel}>Email</Text>
      <Text style={styles.cardValue}>{user?.email || '-'}</Text>
      <TouchableOpacity style={styles.editButton} onPress={onEdit}>
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function AccountSettingsCard({ onChangePhone, onChangePassword, onDeleteAccount }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>Account Settings</Text>
      <TouchableOpacity style={styles.optionButton} onPress={onChangePhone}>
        <Text style={styles.optionText}>Change Phone Number</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.optionButton} onPress={onChangePassword}>
        <Text style={styles.optionText}>Change Password</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.optionButton, { borderBottomWidth: 0 }]} onPress={onDeleteAccount}>
        <Text style={[styles.optionText, { color: '#dc3545' }]}>Delete Account</Text>
      </TouchableOpacity>
    </View>
  );
}

function SignInCard({ onSignIn, onRegister }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>Sign In</Text>
      <Text style={styles.cardDescription}>
        Save properties. Save searches. And set up alerts for when something new hits the market.
      </Text>
      <TouchableOpacity style={styles.signInButton} onPress={onSignIn}>
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRegister}>
        <Text style={styles.createAccountLink}>Create an account</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AccountScreen() {
  const navigation = useNavigation();
  const { user, setUser, logout, isLoading: authLoading } = useAuth();

  // Modal and field state
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Show modal pre-filled with user info
  const handleOpenModal = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setModalVisible(true);
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/auth/me`, // <-- Adjust endpoint as needed
        { name: editName, email: editEmail }
      );
      setUser(response.data.user);        // Update context/state
      setModalVisible(false);             // Close modal
    } catch (err) {
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Account management handlers
  const handleChangePhone = () => navigation.navigate('ChangePhone');
  const handleChangePassword = () => navigation.navigate('ChangePassword');
  const handleDeleteAccount = () => navigation.navigate('DeleteAccount');
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      alert('Logged out successfully!');
    } else {
      alert(result.error);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Checking authentication...</Text>
      </View>
    );
  }

  // Main content (header)
  const ListHeader = () => (
    <View style={styles.listHeaderContainer}>
      <Text style={styles.header}>Account</Text>
      {user ? (
        <>
          <ProfileCard user={user} onEdit={handleOpenModal} />
          <AccountSettingsCard
            onChangePhone={handleChangePhone}
            onChangePassword={handleChangePassword}
            onDeleteAccount={handleDeleteAccount}
          />
        </>
      ) : (
        <SignInCard
          onSignIn={() => navigation.navigate('Login')}
          onRegister={() => navigation.navigate('Register')}
        />
      )}

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>APP SETTINGS</Text>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Privacy settings')}>
          <Text style={styles.optionText}>Privacy settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>SUPPORT</Text>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Suggest an improvement')}>
          <Text style={styles.optionText}>Suggest an improvement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('FAQs')}>
          <Text style={styles.optionText}>FAQs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>LEGAL</Text>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Terms of use')}>
          <Text style={styles.optionText}>Terms of use</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Privacy policy')}>
          <Text style={styles.optionText}>Privacy policy</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.appVersion}>App version 1.0.0</Text>
    </View>
  );

  // Footer with logout button if logged in
  const ListFooter = () =>
    user ? (
      <View style={styles.logoutFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        data={[]}
        keyExtractor={(_, index) => String(index)}
        renderItem={null}
        contentContainerStyle={styles.flatListContentContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Place modal OUTSIDE the FlatList to prevent flickers */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Name"
            />
            <TextInput
              style={styles.modalInput}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalBtnRow}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
              <Button title={saving ? "Saving..." : "Save"} onPress={handleSave} disabled={saving} />
            </View>
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
  },
  flatListContentContainer: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  listHeaderContainer: {
    width: '100%',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 0,
    marginBottom: 15,
    width: CARD_WIDTH,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#002f3d',
  },
  cardLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
  cardValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  editButton: {
    marginTop: 16,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  signInButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#00c3a5',
    borderRadius: 8,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createAccountLink: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
    paddingVertical: 5,
  },
  logoutFooter: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  logoutButton: {
    width: CARD_WIDTH,
    padding: 15,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 0,
    marginBottom: 15,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  optionButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  appVersion: {
    fontSize: 14,
    color: '#888',
    marginTop: 20,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '86%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 22,
    color: '#002f3d',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
});