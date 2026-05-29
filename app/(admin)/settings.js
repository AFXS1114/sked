import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import FlatButton from '../../components/FlatButton';
import FlatTextInput from '../../components/FlatTextInput';
import FlatCard from '../../components/FlatCard';

const DEFAULT_SHIFTS = [
  { id: 'market_shift_1', name: 'Market Shift 1', time: '4am - 12nn', color: '#2E7D32', bg: '#E8F5E9' },
  { id: 'market_shift_2', name: 'Market Shift 2', time: '8am - 4pm', color: '#1565C0', bg: '#E3F2FD' },
  { id: 'market_shift_3', name: 'Market Shift 3', time: '8pm - 4am', color: '#6A1B9A', bg: '#F3E5F5' },
  { id: 'market_shift_4', name: 'Market Shift 4', time: '10pm - 6am', color: '#E65100', bg: '#FFF3E0' }
];

const COLOR_PRESETS = [
  { color: '#2E7D32', bg: '#E8F5E9', label: 'Green' },
  { color: '#1565C0', bg: '#E3F2FD', label: 'Blue' },
  { color: '#6A1B9A', bg: '#F3E5F5', label: 'Purple' },
  { color: '#E65100', bg: '#FFF3E0', label: 'Orange' },
  { color: '#C62828', bg: '#FFEBEE', label: 'Red' },
  { color: '#00695C', bg: '#E0F2F1', label: 'Teal' },
];

export default function SettingsScreen() {
  const [shifts, setShifts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [editingShift, setEditingShift] = useState(null);
  const [editName, setEditName] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editColorIndex, setEditColorIndex] = useState(0);
  const [defaultPosition, setDefaultPosition] = useState('');

  useEffect(() => {
    loadShifts();
    loadDefaultPosition();
  }, []);

  async function loadShifts() {
    try {
      const stored = await AsyncStorage.getItem('sked_shifts');
      if (stored) {
        setShifts(JSON.parse(stored));
      } else {
        setShifts(DEFAULT_SHIFTS);
        await AsyncStorage.setItem('sked_shifts', JSON.stringify(DEFAULT_SHIFTS));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadDefaultPosition() {
    try {
      const stored = await AsyncStorage.getItem('sked_default_position');
      if (stored) setDefaultPosition(stored);
    } catch (e) {
      console.error(e);
    }
  }

  async function saveDefaultPosition(value) {
    setDefaultPosition(value);
    try {
      await AsyncStorage.setItem('sked_default_position', value);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAddShift() {
    if (!name.trim() || !time.trim()) {
      Alert.alert('Validation Error', 'Please fill in both the shift name and working hours.');
      return;
    }

    const newShift = {
      id: 'custom_shift_' + Date.now(),
      name: name.trim(),
      time: time.trim(),
      color: COLOR_PRESETS[selectedColorIndex].color,
      bg: COLOR_PRESETS[selectedColorIndex].bg,
    };

    const updated = [...shifts, newShift];
    try {
      await AsyncStorage.setItem('sked_shifts', JSON.stringify(updated));
      setShifts(updated);
      setModalVisible(false);
      setName('');
      setTime('');
      setSelectedColorIndex(0);
      Alert.alert('Success', `Shift "${newShift.name}" has been created!`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save the new shift.');
    }
  }

  function openEditModal(shift) {
    setEditingShift(shift);
    setEditName(shift.name);
    setEditTime(shift.time);
    const colorIdx = COLOR_PRESETS.findIndex(p => p.color === shift.color);
    setEditColorIndex(colorIdx >= 0 ? colorIdx : 0);
    setEditModalVisible(true);
  }

  async function handleSaveEdit() {
    if (!editName.trim() || !editTime.trim()) {
      Alert.alert('Validation Error', 'Please fill in both the shift name and working hours.');
      return;
    }

    const updated = shifts.map(s => {
      if (s.id === editingShift.id) {
        return {
          ...s,
          name: editName.trim(),
          time: editTime.trim(),
          color: COLOR_PRESETS[editColorIndex].color,
          bg: COLOR_PRESETS[editColorIndex].bg,
        };
      }
      return s;
    });

    try {
      await AsyncStorage.setItem('sked_shifts', JSON.stringify(updated));
      setShifts(updated);
      setEditModalVisible(false);
      setEditingShift(null);
      Alert.alert('Success', `Shift "${editName.trim()}" has been updated!`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save the shift changes.');
    }
  }

  async function handleDeleteShift(id, shiftName) {
    Alert.alert('Confirm Delete', `Are you sure you want to delete the shift "${shiftName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = shifts.filter(s => s.id !== id);
          try {
            await AsyncStorage.setItem('sked_shifts', JSON.stringify(updated));
            setShifts(updated);
            Alert.alert('Deleted', 'Shift has been removed.');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete the shift.');
          }
        },
      },
    ]);
  }

  async function handleReset() {
    Alert.alert('Reset Shifts', 'Reset shifts back to the 4 default Market Shifts?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.setItem('sked_shifts', JSON.stringify(DEFAULT_SHIFTS));
            setShifts(DEFAULT_SHIFTS);
            Alert.alert('Reset Complete', 'Default shifts restored.');
          } catch (e) {
            Alert.alert('Error', 'Failed to reset shifts.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Shift Settings</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtext}>Configure shifts and active hours available in the Monthly Scheduler.</Text>

      <FlatList
        data={shifts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isDefault = DEFAULT_SHIFTS.some(s => s.id === item.id);
          return (
            <FlatCard style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.colorIndicator, { backgroundColor: item.color || '#3498DB' }]} />
                <View>
                  <Text style={styles.shiftName}>{item.name}</Text>
                  <Text style={styles.shiftTime}>{item.time}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                {isDefault && <Text style={styles.tag}>DEFAULT</Text>}
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editBtn}>
                  <Ionicons name="pencil-outline" size={18} color="#3498DB" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteShift(item.id, item.name)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            </FlatCard>
          );
        }}
      />

      <TouchableOpacity onPress={handleReset} style={styles.resetLink}>
        <Text style={styles.resetText}>Restore Default Market Shifts</Text>
      </TouchableOpacity>

      {/* Default Position Section */}
      <View style={styles.sectionDivider} />
      <Text style={styles.sectionTitle}>Employee Defaults</Text>
      <Text style={styles.subtext}>Set a default position that will be pre-filled when adding new employees.</Text>
      <FlatCard style={styles.positionCard}>
        <View style={styles.positionRow}>
          <Ionicons name="briefcase-outline" size={20} color="#2C3E50" style={{ marginRight: 12 }} />
          <FlatTextInput
            placeholder="e.g. Cashier, Bagger, Manager"
            value={defaultPosition}
            onChangeText={saveDefaultPosition}
            style={styles.positionInput}
          />
        </View>
      </FlatCard>

      {/* Add Shift Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Shift</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.inputLabel}>Shift Name</Text>
              <FlatTextInput
                placeholder="e.g. Gater Shift"
                value={name}
                onChangeText={setName}
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Working Hours</Text>
              <FlatTextInput
                placeholder="e.g. 6am - 2pm"
                value={time}
                onChangeText={setTime}
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Theme Color Preset</Text>
              <View style={styles.presetContainer}>
                {COLOR_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedColorIndex(idx)}
                    style={[
                      styles.presetChip,
                      { backgroundColor: preset.bg, borderColor: preset.color },
                      selectedColorIndex === idx && styles.selectedPresetChip
                    ]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: preset.color }]} />
                    <Text style={[styles.presetLabel, { color: preset.color }]}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FlatButton
                title="Create Shift"
                onPress={handleAddShift}
                color="#2ECC71"
                style={styles.submitBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Shift Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Shift</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.inputLabel}>Shift Name</Text>
              <FlatTextInput
                placeholder="e.g. Market Shift 1"
                value={editName}
                onChangeText={setEditName}
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Working Hours</Text>
              <FlatTextInput
                placeholder="e.g. 4am - 12nn"
                value={editTime}
                onChangeText={setEditTime}
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Theme Color Preset</Text>
              <View style={styles.presetContainer}>
                {COLOR_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setEditColorIndex(idx)}
                    style={[
                      styles.presetChip,
                      { backgroundColor: preset.bg, borderColor: preset.color },
                      editColorIndex === idx && styles.selectedPresetChip
                    ]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: preset.color }]} />
                    <Text style={[styles.presetLabel, { color: preset.color }]}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FlatButton
                title="Save Changes"
                onPress={handleSaveEdit}
                color="#3498DB"
                style={styles.submitBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50' },
  subtext: { fontSize: 13, color: '#7F8C8D', marginBottom: 16, lineHeight: 18 },
  addBtn: { backgroundColor: '#E74C3C', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  colorIndicator: { width: 14, height: 14, borderRadius: 7, marginRight: 16 },
  shiftName: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  shiftTime: { fontSize: 14, color: '#7F8C8D', marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag: { fontSize: 10, fontWeight: 'bold', color: '#7F8C8D', backgroundColor: '#ECF0F1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  editBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  resetLink: { alignSelf: 'center', marginVertical: 12 },
  resetText: { color: '#E74C3C', fontWeight: 'bold', fontSize: 14 },

  // Section
  sectionDivider: { height: 1, backgroundColor: '#ECF0F1', marginVertical: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  positionCard: { paddingVertical: 10, paddingHorizontal: 14 },
  positionRow: { flexDirection: 'row', alignItems: 'center' },
  positionInput: { flex: 1 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ECF0F1', paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  modalForm: { paddingTop: 16 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50', marginTop: 12, marginBottom: 4 },
  textInput: { marginVertical: 4 },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPresetChip: {
    borderWidth: 1,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  presetLabel: { fontSize: 12, fontWeight: 'bold' },
  submitBtn: { marginTop: 24, marginBottom: 12 },
});
