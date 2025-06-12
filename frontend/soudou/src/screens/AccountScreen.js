import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

// Card width for all cards
const CARD_WIDTH = '92%';

// SectionCard component for APP SETTINGS, SUPPORT, LEGAL
function SectionCard({ header, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{header}</Text>
      {children}
    </View>
  );
}

// Welcome card for logged-in user
function LoggedInCard({ user, onLogout, onAddProperty }) {
  return (
    <View style={styles.loggedInCard}>
      <Text style={styles.loggedInHeader}>Welcome, {user.name}!</Text>
      <Text style={styles.loggedInText}>Phone: {user.phoneNumber}</Text>
      {user.email && <Text style={styles.loggedInText}>Email: {user.email}</Text>}
      <Text style={styles.loggedInText}>Role: {user.role}</Text>
      {user.role === 'agent' && (
        <TouchableOpacity style={styles.addPropertyButton} onPress={onAddProperty}>
          <Text style={styles.addPropertyButtonText}>Add New Property</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

// Card for not logged-in user
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
  const { user, logout, isLoading: authLoading } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      alert('Logged out successfully!');
    } else {
      alert(result.error);
    }
  };

  const handleAddPropertyPress = () => {
    navigation.navigate('HomeTab', { screen: 'AddProperty' });
  };

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Checking authentication...</Text>
      </View>
    );
  }

  const ListHeader = () => (
    <View style={styles.listHeaderContainer}>
      <Text style={styles.header}>Account</Text>
      {user ? (
        <LoggedInCard
          user={user}
          onLogout={handleLogout}
          onAddProperty={handleAddPropertyPress}
        />
      ) : (
        <SignInCard
          onSignIn={() => navigation.navigate('Login')}
          onRegister={() => navigation.navigate('Register')}
        />
      )}

      <SectionCard header="APP SETTINGS">
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Privacy settings')}>
          <Text style={styles.optionText}>Privacy settings</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard header="SUPPORT">
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Suggest an improvement')}>
          <Text style={styles.optionText}>Suggest an improvement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('FAQs')}>
          <Text style={styles.optionText}>FAQs</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard header="LEGAL">
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Terms of use')}>
          <Text style={styles.optionText}>Terms of use</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={() => console.log('Privacy policy')}>
          <Text style={styles.optionText}>Privacy policy</Text>
        </TouchableOpacity>
      </SectionCard>

      <Text style={styles.appVersion}>App version 1.0.0</Text>
    </View>
  );

  return (
    <FlatList
      ListHeaderComponent={ListHeader}
      data={[]}
      keyExtractor={(item) => item._id}
      renderItem={null}
      contentContainerStyle={styles.flatListContentContainer}
      showsVerticalScrollIndicator={false}
      style={styles.container}
    />
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
    // Do not center align items, left align for consistent card edge
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
    marginBottom: 10,
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
  cardDescription: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
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
  loggedInCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 0,
    marginBottom: 20,
    width: CARD_WIDTH,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loggedInHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#002f3d',
  },
  loggedInText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  logoutButton: {
    marginTop: 15,
    width: '100%',
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
  addPropertyButton: {
    marginTop: 15,
    width: '100%',
    padding: 15,
    backgroundColor: '#28a745',
    borderRadius: 8,
    alignItems: 'center',
  },
  addPropertyButtonText: {
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
});