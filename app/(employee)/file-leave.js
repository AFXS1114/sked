import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import FlatButton from '../../components/FlatButton';
import FlatTextInput from '../../components/FlatTextInput';
import { Ionicons } from '@expo/vector-icons';

const toDateString = (date) => date.toISOString().split('T')[0];

function DatePickerField({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  const date = value ? new Date(value + 'T12:00:00') : new Date();

  const handleChange = (event, selectedDate) => {
    setShow(Platform.OS === 'ios'); // keep open on iOS
    if (selectedDate) {
      onChange(toDateString(selectedDate));
    }
  };

  return (
    <View style={dpStyles.wrapper}>
      <TouchableOpacity style={dpStyles.field} onPress={() => setShow(true)} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={20} color="#2ECC71" style={{ marginRight: 8 }} />
        <Text style={value ? dpStyles.valueText : dpStyles.placeholder}>
          {value || label}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const dpStyles = StyleSheet.create({
  wrapper: { marginVertical: 8, width: '100%' },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', padding: 16, borderRadius: 8,
    borderWidth: 1, borderColor: '#BDC3C7',
  },
  placeholder: { color: '#7F8C8D', fontSize: 16 },
  valueText: { color: '#2C3E50', fontSize: 16 },
});

export default function FileLeaveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const employeeId = params.employeeId;

  const [employeeName, setEmployeeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeName();
    } else {
      Alert.alert('Error', 'No employee selected. Please select a user first.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [employeeId]);

  async function fetchEmployeeName() {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('full_name')
      .eq('id', employeeId)
      .single();

    if (!error && data) {
      setEmployeeName(data.full_name);
    } else {
      Alert.alert('Error', 'Employee not found.');
      router.back();
    }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!startDate || !endDate || !reason.trim()) {
      Alert.alert('Validation', 'Please select both dates and enter a reason.');
      return;
    }

    if (endDate < startDate) {
      Alert.alert('Validation', 'End date must be on or after start date.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('leaves')
      .insert([{
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        status: 'pending' // default status for employee-filed leaves
      }]);

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Trigger notification for manager and admin
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "📬 New Leave Request Filed!",
              body: `${employeeName} requested leave from ${startDate} to ${endDate} for: "${reason.trim()}"`,
            },
            trigger: null, // trigger immediately
          });
        }
      } catch (err) {
        console.error('Failed to schedule notification:', err);
      }

      Alert.alert(
        'Success', 
        'Your leave request has been submitted successfully and is pending approval from the admin/manager.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Ionicons name="person-circle" size={40} color="#2ECC71" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Filing Leave For</Text>
          <Text style={styles.name}>{employeeName || 'Loading...'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Leave Period</Text>
      <DatePickerField label="Select Start Date" value={startDate} onChange={setStartDate} />
      <DatePickerField label="Select End Date" value={endDate} onChange={setEndDate} />

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Reason for Leave</Text>
      <FlatTextInput
        placeholder="Please explain the reason for your leave request..."
        value={reason}
        onChangeText={setReason}
        multiline={true}
        numberOfLines={4}
        style={styles.textArea}
      />

      <View style={{ flex: 1 }} />

      <FlatButton
        title={submitting ? "Submitting..." : "Submit Leave Request"}
        onPress={handleSubmit}
        color="#2ECC71"
        disabled={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  label: { fontSize: 12, color: '#7F8C8D', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 0.5 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8, marginLeft: 4 },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});
