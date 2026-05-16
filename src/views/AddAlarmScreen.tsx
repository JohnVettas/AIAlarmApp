import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlarmItem } from './HomeScreen';

const STORAGE_KEY = '@ai_alarms_list';

export default function AddAlarmScreen() {
  const navigation = useNavigation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<boolean>(false);

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleSaveAlarm = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your alarm.');
      return;
    }

    const formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    //Create the new alarm object
    const newAlarm: AlarmItem = {
      id: Date.now().toString(),
      title,
      description,
      time: formattedTime,
      isActive: true,
    };

    try {
      // Gets data already in storage and adds the new one
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existingAlarms: AlarmItem[] = stored ? JSON.parse(stored) : [];

      const updatedAlarms = [...existingAlarms, newAlarm];

      //Save it to AsycStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlarms));

      navigation.goBack();
    } catch (error) {
      console.error('Failed to save alarm directly to storage', error);
      Alert.alert('Error', 'Could not save the alarm to disk.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Alarm Title"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="AI Speech Context Prompt..."
          placeholderTextColor="#888"
          multiline={true}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <TouchableOpacity
        style={styles.timeSelectorButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.timeLabelText}>Set Time:</Text>
        <Text style={styles.timeValueText}>
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour={true}
          onChange={onTimeChange}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleSaveAlarm}>
        <Text style={styles.buttonText}>Save Alarm</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

//STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212529',
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
  },
  textArea: { height: 90, textAlignVertical: 'top', marginBottom: 0 },
  timeSelectorButton: {
    height: 60,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 30,
  },
  timeLabelText: { color: '#495057', fontSize: 16, fontWeight: '600' },
  timeValueText: { color: '#007bff', fontSize: 20, fontWeight: 'bold' },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});
