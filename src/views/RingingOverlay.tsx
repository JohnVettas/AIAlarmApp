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

const STORAGE_KEY = '@ai_alarms_list';

interface Props {
  alarmId: string;
  alarmTitle: string;
  onDiscard: () => void;
}

export default function RingingOverlay({
  alarmId,
  alarmTitle,
  onDiscard,
}: Props) {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString(),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // TODO: AI Voice playback logic will go here

    return () => clearInterval(timer);
  }, []);

  const handleDiscard = async () => {
    //TODO: Stop AI Voice playback here

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
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timeText: { fontSize: 60, fontWeight: 'bold', color: '#007bff' },
  titleText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#343a40',
    marginTop: 10,
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
