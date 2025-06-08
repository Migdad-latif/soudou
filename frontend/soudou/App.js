import React, { useRef } from 'react'; // Import useRef
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  const navigationRef = useRef(null); // Define the navigationRef here

  return (
    <AuthProvider navigationRef={navigationRef}> {/* Pass the ref as a prop */}
      <NavigationContainer ref={navigationRef}> {/* Attach the ref to NavigationContainer */}
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}