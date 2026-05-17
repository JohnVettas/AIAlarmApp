import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Modal,
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

    //PLAY THE AI VOICE
    Tts.getInitStatus()
      .then(() => {
        // Ignore the silent switch (so it reads even if phone is on vibrate)
        Tts.setIgnoreSilentSwitch('ignore');

        Tts.setDefaultRate(0.5); // Speed of the voice
        Tts.setDefaultPitch(1.0); // Pitch of the voice

        //Starts talking
        Tts.speak(alarmScript || 'Good morning! It is time to wake up.');
      })
      .catch(err => {
        console.error('TTS Initialization failed', err);
      });

    return () => {
      clearInterval(timer);
      Tts.stop(); 
    };
  }, [alarmId, alarmScript]);

  const handleDiscard = async () => {
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
