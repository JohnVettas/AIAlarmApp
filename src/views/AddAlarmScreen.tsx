import React, { useState } from 'react';
import { generateAlarmScript } from '../services/aiService';
import RNAlarmModule from 'react-native-alarmageddon';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator, //loading feedback
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ai_alarms_list';

export default function AddAlarmScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSaveAlarm = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your alarm.');
      return;
    }

    setIsGenerating(true);

    try {
      const generatedScript = await generateAlarmScript(title, description);

      let scheduledDate = new Date();
      scheduledDate.setHours(date.getHours(), date.getMinutes(), 0, 0);

      if (scheduledDate.getTime() <= Date.now()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      const tzOffset = scheduledDate.getTimezoneOffset() * 60000;
      const localISOTime = new Date(scheduledDate.getTime() - tzOffset)
        .toISOString()
        .slice(0, -1);

      const newId = Date.now().toString();

      await RNAlarmModule.scheduleAlarm({
        id: newId,
        datetimeISO: localISOTime,
        title: title,
        body: 'Wake up!',
        snoozeEnabled: true,
      });

      const formattedTime = scheduledDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const newAlarm = {
        id: newId,
        title,
        description,
        script: generatedScript,
        time: formattedTime,
        isActive: true,
      };

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existingAlarms = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...existingAlarms, newAlarm]),
      );

      setIsGenerating(false);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to set alarm', error);
      Alert.alert(
        'Error',
        'Failed to generate alarm script. Check your internet.',
      );
      setIsGenerating(false);
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
          editable={!isGenerating}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="AI Speech Context Prompt..."
          placeholderTextColor="#888"
          multiline={true}
          value={description}
          onChangeText={setDescription}
          editable={!isGenerating}
        />
      </View>

      <TouchableOpacity
        style={styles.timeSelectorButton}
        onPress={() => !isGenerating && setShowPicker(true)}
        disabled={isGenerating}
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

      <TouchableOpacity
        style={[styles.button, isGenerating && styles.disabledButton]}
        onPress={handleSaveAlarm}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#ffffff" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Writing AI Script...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Save Alarm</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

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
  disabledButton: {
    backgroundColor: '#a0c4ff',
  },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center' },
});
