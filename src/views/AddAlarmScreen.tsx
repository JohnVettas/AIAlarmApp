import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNAlarmModule from 'react-native-alarmageddon';

import { generateAlarmScript } from '../services/aiService';

const STORAGE_KEY = '@ai_alarms_list';

export default function AddAlarmScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [date, setDate] = useState(new Date(Date.now() + 60000));
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('time');

  const onDateTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const showDatepicker = () => {
    setPickerMode('date');
    setShowPicker(true);
  };

  const showTimepicker = () => {
    setPickerMode('time');
    setShowPicker(true);
  };

  const handleSaveAlarm = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your alarm.');
      return;
    }

    // prevent picking past times
    if (date.getTime() <= Date.now()) {
      Alert.alert(
        'Time Travel Detected',
        'You cannot set an alarm for the past. Please pick a future date and time.'
      );
      return;
    }

    setIsGenerating(true);

    try {
      const generatedScript = await generateAlarmScript(title, description, date);

      const scheduledDate = new Date(date);
      scheduledDate.setSeconds(0, 0);

      const tzOffset = scheduledDate.getTimezoneOffset() * 60000;
      const localISOTime = new Date(scheduledDate.getTime() - tzOffset).toISOString().slice(0, -1);

      const newId = Date.now().toString();

      await RNAlarmModule.scheduleAlarm({
        id: newId,
        datetimeISO: localISOTime,
        title: title,
        body: 'Ai Alarm: ' + title,
        snoozeEnabled: true,
      });

      const datePart = scheduledDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const timePart = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedTime = `${datePart}, ${timePart}`;

      const newAlarm = {
        id: newId,
        title: title,
        description: description,
        script: generatedScript,
        time: formattedTime,
        timestamp: scheduledDate.getTime(),
        isActive: true,
      };

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let existingAlarms = [];
      
      if (stored) {
        existingAlarms = JSON.parse(stored);
      }

      const updatedAlarms = [...existingAlarms, newAlarm];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlarms));

      setIsGenerating(false);
      navigation.goBack();
      
    } catch (error) {
      console.error('Failed to set alarm', error);
      Alert.alert('Error', 'Failed to generate alarm script. Check your internet.');
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

      <View style={styles.pickerContainer}>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={showDatepicker}
          disabled={isGenerating}
        >
          <Text style={styles.labelText}>Date:</Text>
          <Text style={styles.valueText}>
            {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectorButton}
          onPress={showTimepicker}
          disabled={isGenerating}
        >
          <Text style={styles.labelText}>Time:</Text>
          <Text style={styles.valueText}>
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode={pickerMode}
          is24Hour={true}
          minimumDate={new Date()}
          onChange={onDateTimeChange}
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
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  selectorButton: {
    flex: 0.48,
    height: 65,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  labelText: { color: '#495057', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  valueText: { color: '#007bff', fontSize: 16, fontWeight: 'bold' },
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