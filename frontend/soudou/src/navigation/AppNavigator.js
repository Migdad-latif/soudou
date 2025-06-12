import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import your screen components
import HomeScreen from '../screens/HomeScreen';
import FiltersScreen from '../screens/FiltersScreen';
import PropertyDetailsScreen from '../screens/PropertyDetailsScreen';
import SavedScreen from '../screens/SavedScreen';
import EnquiriesScreen from '../screens/EnquiriesScreen';
import AccountScreen from '../screens/AccountScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AddPropertyScreen from '../screens/AddPropertyScreen';

import { useAuth } from '../context/AuthContext';
import i18n from '../localization/i18n';

const HomeStack = createStackNavigator();
const AccountStack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Helper to force re-render on language change
function useForceLanguageRerender() {
  const [lang, setLang] = useState(i18n.locale);
  useEffect(() => {
    // Listen for language change on i18n-js
    if (i18n.onChange) {
      const unsub = i18n.onChange(() => setLang(i18n.locale));
      return () => { if (unsub?.remove) unsub.remove(); };
    }
    // Poll as a fallback
    const interval = setInterval(() => {
      if (i18n.locale !== lang) setLang(i18n.locale);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);
}

// Stack Navigator for the Home Tab
function HomeStackNavigator() {
  useForceLanguageRerender();
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Filters"
        component={FiltersScreen}
        options={() => ({ title: i18n.t('propertyFilters') })}
      />
      <HomeStack.Screen
        name="PropertyDetails"
        component={PropertyDetailsScreen}
        options={() => ({ title: i18n.t('propertyDetails') })}
      />
      <HomeStack.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={() => ({ title: i18n.t('addNewProperty') })}
      />
    </HomeStack.Navigator>
  );
}

// Stack Navigator for the Account Tab (handles Login/Register flow)
function AccountStackNavigator() {
  useForceLanguageRerender();
  return (
    <AccountStack.Navigator>
      <AccountStack.Screen
        name="Account"
        component={AccountScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="Login"
        component={LoginScreen}
        options={() => ({ title: i18n.t('signIn') })}
      />
      <AccountStack.Screen
        name="Register"
        component={RegisterScreen}
        options={() => ({ title: i18n.t('createAccount') })}
      />
    </AccountStack.Navigator>
  );
}

// --- Wrappers for dynamic tab icon and label --- //
function SavedTabBarIcon({ color, size, focused }) {
  const { user } = useAuth();
  if (user && user.role === 'agent') {
    return <Ionicons name="grid" size={size} color={color} />;
  }
  return <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />;
}
function SavedTabBarLabel({ color }) {
  const { user } = useAuth();
  return (
    <Text style={{ color, fontSize: 12 }}>
      {user && user.role === 'agent' ? i18n.t('dashboard') : i18n.t('saved')}
    </Text>
  );
}

// Main Bottom Tab Navigator
function AppNavigator() {
  useForceLanguageRerender();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#00c3a5',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'HomeTab') {
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
          } else if (route.name === 'Saved') {
            return <SavedTabBarIcon color={color} size={size} focused={focused} />;
          } else if (route.name === 'Enquiries') {
            return <Ionicons name={focused ? 'mail' : 'mail-outline'} size={size} color={color} />;
          } else if (route.name === 'AccountTab') {
            return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />;
          }
        },
        tabBarLabel: ({ focused, color }) => {
          if (route.name === 'Saved') {
            return <SavedTabBarLabel color={color} />;
          }
          if (route.name === 'HomeTab') return <Text style={{ color, fontSize: 12 }}>{i18n.t('home')}</Text>;
          if (route.name === 'Enquiries') return <Text style={{ color, fontSize: 12 }}>{i18n.t('enquiries')}</Text>;
          if (route.name === 'AccountTab') return <Text style={{ color, fontSize: 12 }}>{i18n.t('account')}</Text>;
        }
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: i18n.t('home'),
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{
          title: i18n.t('saved'),
        }}
      />
      <Tab.Screen
        name="Enquiries"
        component={EnquiriesScreen}
        options={{
          title: i18n.t('enquiries'),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStackNavigator}
        options={{
          title: i18n.t('account'),
        }}
      />
    </Tab.Navigator>
  );
}

export default AppNavigator;