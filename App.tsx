import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/views/HomeScreen';
import AddAlarmScreen from './src/views/AddAlarmScreen';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'My AI Alarms', headerTitleAlign: 'center' }} 
        />
        <Stack.Screen 
          name="AddAlarm" 
          component={AddAlarmScreen} 
          options={{ title: 'Create Alarm', headerBackTitle: '' }} 
        />
      </Stack.Navigator>
      
    </NavigationContainer>
  );
}

export default App;