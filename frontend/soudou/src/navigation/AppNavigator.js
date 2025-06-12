import React from 'react';
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

const HomeStack = createStackNavigator();
const AccountStack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStackNavigator() {
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
        options={{ title: 'Property Filters' }}
      />
      <HomeStack.Screen
        name="PropertyDetails"
        component={PropertyDetailsScreen}
        options={{ title: 'Property Details' }}
      />
      <HomeStack.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{ title: 'Add New Property' }}
      />
    </HomeStack.Navigator>
  );
}

function AccountStackNavigator() {
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
        options={{ title: 'Sign In' }}
      />
      <AccountStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Create Account' }}
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
      {user && user.role === 'agent' ? "Dashboard" : "Saved"}
    </Text>
  );
}

// Main Bottom Tab Navigator
function AppNavigator() {
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
          if (route.name === 'HomeTab') return <Text style={{ color, fontSize: 12 }}>Home</Text>;
          if (route.name === 'Enquiries') return <Text style={{ color, fontSize: 12 }}>Enquiries</Text>;
          if (route.name === 'AccountTab') return <Text style={{ color, fontSize: 12 }}>Account</Text>;
        }
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ title: 'Home' }}
      />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Enquiries" component={EnquiriesScreen} />
      <Tab.Screen
        name="AccountTab"
        component={AccountStackNavigator}
        options={{ title: 'Account' }}
      />
    </Tab.Navigator>
  );
}

export default AppNavigator;