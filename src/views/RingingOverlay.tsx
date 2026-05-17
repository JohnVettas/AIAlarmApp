import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNAlarmModule from 'react-native-alarmageddon';
import Speech from '@mhpdev/react-native-speech';

const STORAGE_KEY = '@ai_alarms_list';

interface Props {
  alarmId: string;
  alarmTitle: string;
  alarmScript: string;
  onDiscard: () => void;
}

export default function RingingOverlay({
  alarmId,
  alarmTitle,
  alarmScript,
  onDiscard,
}: Props) {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString(),
  );

  const isRinging = useRef(true);
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      RNAlarmModule.stopCurrentAlarm(alarmId);
      RNAlarmModule.cancelAlarm(alarmId);
    } catch (error) {
      console.log('Could not dismiss native alarm', error);
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    const textToRead =
      alarmScript || `It is time for your alarm: ${alarmTitle}.`;

    const speakAlarm = async () => {
      try {
        await Speech.speak(textToRead, {
          rate: 0.9,
          pitch: 1.0,
          silentMode: 'ignore',
        });
      } catch (err) {
        console.error('Speech synthesis failed', err);
      }
    };

    const finishSubscription = Speech.onFinish(() => {
      if (isRinging.current) {
        loopTimeoutRef.current = setTimeout(() => {
          if (isRinging.current) {
            speakAlarm();
          }
        }, 4000);
      }
    });

    const startTimeout = setTimeout(() => {
      if (isRinging.current) speakAlarm();
    }, 300);

    return () => {
      isRinging.current = false;
      clearInterval(timer);
      clearTimeout(startTimeout);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      finishSubscription.remove();
    };
  }, [alarmId, alarmScript, alarmTitle]);

  const handleDiscard = async () => {
    isRinging.current = false;

    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    Speech.stop();

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      if (stored) {
        const alarms = JSON.parse(stored);

        const updatedAlarms = alarms.map((alarm: any) => {
          if (alarm.id === alarmId) {
            return { ...alarm, isActive: false };
          }
          return alarm;
        });

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlarms));
      }
    } catch (error) {
      console.error('Failed to update storage', error);
    }

    DeviceEventEmitter.emit('refreshAlarms');
    onDiscard();
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {}}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.timeText}>{currentTime}</Text>
          <Text style={styles.titleText}>{alarmTitle || 'Alarm'}</Text>
          <Text style={styles.scriptText}>{alarmScript}</Text>
        </View>

        <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timeText: { fontSize: 60, fontWeight: 'bold', color: '#007bff' },
  titleText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#343a40',
    marginTop: 10,
  },
  scriptText: {
    fontSize: 18,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
  },
  discardButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  discardButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
