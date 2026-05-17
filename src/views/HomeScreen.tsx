import React, { useState, useCallback, useEffect } from 'react';
import { AlarmItem } from '../types/alarm';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNAlarmModule from 'react-native-alarmageddon';



const STORAGE_KEY = '@ai_alarms_list';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadAlarms = async () => {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          
          if (stored) {
            setAlarms(JSON.parse(stored));
          }
        } catch (error) {
          console.error('Failed to load alarms', error);
        }
      };
      
      loadAlarms();
    }, [])
  );

  useEffect(() => {
    // refresh list when triggered from other screens
    const subscription = DeviceEventEmitter.addListener('refreshAlarms', async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (stored) {
          setAlarms(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to refresh alarms from broadcast', error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const deleteAlarm = async (id: string) => {
    try {
      RNAlarmModule.cancelAlarm(id);
    } catch (error) {
      console.log('Failed to cancel native alarm', error);
    }

    const updatedAlarms = alarms.filter((alarm) => alarm.id !== id);
    setAlarms(updatedAlarms);
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlarms));
  };

  const toggleAlarm = async (id: string, currentlyActive: boolean) => {
    const targetAlarm = alarms.find((a) => a.id === id);
    
    if (!targetAlarm) return;

    if (currentlyActive) {
      // turning off the alarm
      try {
        RNAlarmModule.cancelAlarm(id);
      } catch (e) {}
      
      const updatedAlarms = alarms.map((a) => 
        a.id === id ? { ...a, isActive: false } : a
      );
      
      setAlarms(updatedAlarms);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlarms));
      
    } else {
      const originalDate = targetAlarm.timestamp ? new Date(targetAlarm.timestamp) : new Date();
      const now = new Date();

      if (originalDate > now && targetAlarm.timestamp) {
        // turning on a future alarm
        try {
          const tzOffset = originalDate.getTimezoneOffset() * 60000;
          const localISOTime = new Date(originalDate.getTime() - tzOffset).toISOString().slice(0, -1);
          
          await RNAlarmModule.scheduleAlarm({
            id: targetAlarm.id,
            datetimeISO: localISOTime,
            title: targetAlarm.title,
            body: 'Ai Alarm: ' + targetAlarm.title,
            snoozeEnabled: true,
          });
        } catch (e) {}

        const updatedAlarms = alarms.map((a) => 
          a.id === id ? { ...a, isActive: true } : a
        );
        
        setAlarms(updatedAlarms);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlarms));

      } else {
        // alarm time has passed
        Alert.alert('Time has passed', 'Turn it on for tomorrow same time?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'OK',
            onPress: async () => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);

              try {
                const tzOffset = tomorrow.getTimezoneOffset() * 60000;
                const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, -1);
                
                await RNAlarmModule.scheduleAlarm({
                  id: targetAlarm.id,
                  datetimeISO: localISOTime,
                  title: targetAlarm.title,
                  body: 'Ai Alarm: ' + targetAlarm.title,
                  snoozeEnabled: true,
                });
              } catch (e) {}

              const datePart = tomorrow.toLocaleDateString([], { month: 'short', day: 'numeric' });
              const timePart = tomorrow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              const updatedAlarms = alarms.map((a) =>
                a.id === id ? { 
                  ...a, 
                  isActive: true, 
                  time: `${datePart}, ${timePart}`,
                  timestamp: tomorrow.getTime() 
                } : a
              );
              
              setAlarms(updatedAlarms);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlarms));
            },
          },
        ]);
      }
    }
  };

  const handleLongPress = (id: string, title: string) => {
    Alert.alert('Manage Alarm', `What would you like to do with "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', onPress: () => deleteAlarm(id), style: 'destructive' },
    ]);
  };

  const renderAlarmCard = ({ item }: { item: AlarmItem }) => (
    <TouchableOpacity
      style={[styles.alarmCard, !item.isActive && styles.disabledCard]}
      onLongPress={() => handleLongPress(item.id, item.title)}
      delayLongPress={500}
    >
      <View style={styles.alarmInfo}>
        <Text style={[styles.alarmTimeText, !item.isActive && styles.disabledText]}>
          {item.time}
        </Text>
        <Text style={styles.alarmTitleText}>{item.title}</Text>
      </View>
      <Switch
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={item.isActive ? '#007bff' : '#f4f3f4'}
        onValueChange={() => toggleAlarm(item.id, item.isActive)}
        value={item.isActive}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.helperText}>Long press an alarm to delete.</Text>
      <FlatList
        data={alarms}
        renderItem={renderAlarmCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No alarms scheduled yet.</Text>
        }
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddAlarm')}
      >
        <Text style={styles.addButtonText}>+ Add New Alarm</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  helperText: {
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: 15,
    fontSize: 13,
  },
  listContainer: { paddingBottom: 80 },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#888',
    fontSize: 16,
  },
  alarmCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  disabledCard: { backgroundColor: '#e9ecef', opacity: 0.7 },
  alarmInfo: { flex: 1 },
  alarmTimeText: { fontSize: 28, fontWeight: 'bold', color: '#007bff' },
  alarmTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginTop: 4,
  },
  disabledText: { color: '#6c757d' },
  addButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
  },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});