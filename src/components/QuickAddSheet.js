import React, { forwardRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';

const intervals = [
  { label: '+10 Min', value: 10 },
  { label: '+1 Hour', value: 60 },
  { label: '+3 Hours', value: 180 },
  { label: 'Tomorrow', value: 1440 }, // simplified
];

const QuickAddSheet = forwardRef((props, ref) => {
  const snapPoints = useMemo(() => ['50%', '80%'], []);
  const [title, setTitle] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const addTask = useStore((state) => state.addTask);

  const selectedInterval = useMemo(() => {
    const index = Math.round(sliderValue * (intervals.length - 1));
    return intervals[index];
  }, [sliderValue]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    let dueAt = Date.now();
    if (selectedInterval.label === 'Tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      dueAt = tomorrow.getTime();
    } else {
      dueAt += selectedInterval.value * 60000;
    }

    await addTask({
      title,
      due_at: dueAt,
      nag_interval: 5, // default
    });

    setTitle('');
    setSliderValue(0);
    ref.current?.dismiss();
    Keyboard.dismiss();
  }, [title, selectedInterval, addTask, ref]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: '#E0E0E0' }}
    >
      <BottomSheetView style={styles.contentContainer}>
        <Text style={styles.header}>New Reminder</Text>
        
        <BottomSheetTextInput
          style={styles.input}
          placeholder="What needs to be done?"
          placeholderTextColor="#757575"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <View style={styles.sliderSection}>
          <Text style={styles.intervalLabel}>{selectedInterval.label}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={sliderValue}
            onValueChange={setSliderValue}
            minimumTrackTintColor="#6200EE"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#6200EE"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!title.trim()}
        >
          <Text style={styles.saveButtonText}>Save Reminder</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    padding: 24,
    flex: 1,
  },
  header: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1B1F',
    marginBottom: 20,
  },
  input: {
    fontSize: 24,
    color: '#1C1B1F',
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  sliderSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  intervalLabel: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6200EE',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  saveButton: {
    backgroundColor: '#6200EE',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  saveButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default QuickAddSheet;
