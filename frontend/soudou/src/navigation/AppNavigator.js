import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; // For icons in tab bar

// Import your screen components
import HomeScreen from '../screens/HomeScreen';
import FiltersScreen from '../screens/FiltersScreen';
import SavedScreen from '../screens/SavedScreen';
import EnquiriesScreen from '../screens/EnquiriesScreen';
import AccountScreen from '../screens/AccountScreen';

const HomeStack = createStackNavigator(); // Stack for Home screen and its sub-screens (like Filters)
const Tab = createBottomTabNavigator(); // Main bottom tab navigator

// Stack Navigator for the Home Tab
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }} // Hide header for the main Home screen
      />
      <HomeStack.Screen
        name="Filters"
        component={FiltersScreen}
        options={{ title: 'Property Filters' }} // Header for the Filters screen
      />
      {/* Add other screens that are part of the Home flow here (e.g., PropertyDetails) */}
    </HomeStack.Navigator>
  );
}

// Main Bottom Tab Navigator
function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') { // Note: 'HomeTab' is the name of the Tab.Screen
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Saved') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Enquiries') {
            iconName = focused ? 'mail' : 'mail-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }
          // Default icon if somehow no name matches (shouldn't happen)
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00c3a5', // Rightmove green
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // Hide header for all tab screens as stacks will handle them
      })}
    >
      <Tab.Screen
        name="HomeTab" // This is the tab name, the screen it renders is HomeStackNavigator
        component={HomeStackNavigator}
        options={{ title: 'Home' }} // Label shown in the tab bar
      />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Enquiries" component={EnquiriesScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default AppNavigator;