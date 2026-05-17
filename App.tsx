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

function App(): React.JSX.Element {
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmState | null>(null);

  useEffect(() => {
    const checkAlarms = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        const alarms = JSON.parse(stored);
        const currentTime = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        const triggeredAlarm = alarms.find(
          (a: any) => a.isActive && a.time === currentTime,
        );

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
    };

    // Run once on cold boot
    checkAlarms();

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          checkAlarms();
        }
      },
    );

    return () => {
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

      {activeAlarm && (
        <RingingOverlay
          alarmId={activeAlarm.id}
          alarmTitle={activeAlarm.title}
          alarmScript={activeAlarm.script}
          onDiscard={() => setActiveAlarm(null)}
        />
      )}
    </>
  );
}

export default App;