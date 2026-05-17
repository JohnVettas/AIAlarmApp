import React, { useEffect, useState, useRef, use } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNAlarmModule from 'react-native-alarmageddon';
import Tts from 'react-native-tts';

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

    const textToRead = alarmScript || `Good morning! It is time to wake up.`;

    //PLAY THE AI VOICE
    Tts.getInitStatus()
      .then(() => {
        // Ignore the silent switch (so it reads even if phone is on vibrate)
        Tts.setIgnoreSilentSwitch('ignore');

        Tts.setDefaultRate(0.5); // Speed of the voice
        Tts.setDefaultPitch(1.0); // Pitch of the voice

        Tts.addEventListener('tts-finish', () => {
          if (isRinging.current) {
            loopTimeoutRef.current = setTimeout(() => {
              if (isRinging.current) Tts.speak(textToRead);
            }, 4000);
          }
        });

        //Starts talking
        Tts.speak(textToRead);
      })
      .catch(err => {
        console.error('TTS Initialization failed', err);
      });

    return () => {
      isRinging.current = false;
      clearInterval(timer);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      Tts.removeAllListeners('tts-finish');
      Tts.stop();
    };
  }, [alarmId, alarmScript]);

  const handleDiscard = async () => {
    isRinging.current = false;
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    Tts.removeAllListeners('tts-finish');
    Tts.stop();

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const alarms = JSON.parse(stored);
        const updatedAlarms = alarms.map((a: any) =>
          a.id === alarmId ? { ...a, isActive: false } : a,
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlarms));
      }
    } catch (e) {
      console.error('Failed to update storage', e);
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
