import React, { useEffect, useState } from 'react';
import { StatusBar, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './src/views/HomeScreen';
import AddAlarmScreen from './src/views/AddAlarmScreen';
import RingingOverlay from './src/views/RingingOverlay';

const Stack = createNativeStackNavigator();
const STORAGE_KEY = '@ai_alarms_list';

interface ActiveAlarmState {
  id: string;
  title: string;
  script: string;
}

function App() {
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmState | null>(null);

  useEffect(() => {
    // checks if an alarm should be ringing right now
    async function checkAlarms() {
      try {
        const storedAlarms = await AsyncStorage.getItem(STORAGE_KEY);

        if (!storedAlarms) {
          return;
        }

        const alarmsList = JSON.parse(storedAlarms);

        const now = new Date();
        const datePart = now.toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        });
        const timePart = now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        const currentFormattedTime = datePart + ', ' + timePart;

        // look through our alarms to see if one matches right now
        const triggeredAlarm = alarmsList.find(function (alarm: any) {
          return alarm.isActive && alarm.time === currentFormattedTime;
        });

        if (triggeredAlarm) {
          setActiveAlarm({
            id: triggeredAlarm.id,
            title: triggeredAlarm.title,
            script: triggeredAlarm.script || 'Good morning! Time to wake up.',
          });
        }
      } catch (error) {
        console.error('Error checking alarms', error);
      }
    }

    // Run once on app start
    checkAlarms();

    const subscription = AppState.addEventListener(
      'change',
      function (nextAppState) {
        if (nextAppState === 'active') {
          checkAlarms();
        }
      },
    );

    return function cleanup() {
      subscription.remove();
    };
  }, []);

  return (
    <>
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

      {/* show the ringing overlay if we have an active alarm */}
      {activeAlarm !== null && (
        <RingingOverlay
          alarmId={activeAlarm.id}
          alarmTitle={activeAlarm.title}
          alarmScript={activeAlarm.script}
          onDiscard={function () {
            // close the overlay
            setActiveAlarm(null);
          }}
        />
      )}
    </>
  );
}

export default App;
