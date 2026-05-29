import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert, ActivityIndicator,
  TouchableOpacity, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import FlatCard from '../../components/FlatCard';
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
        <Ionicons name="calendar-outline" size={20} color="#3498DB" style={{ marginRight: 8 }} />
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
  wrapper: { marginVertical: 8 },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', padding: 16, borderRadius: 8,
    borderWidth: 1, borderColor: '#BDC3C7',
  },
  placeholder: { color: '#7F8C8D', fontSize: 16 },
  valueText: { color: '#2C3E50', fontSize: 16 },
});

export default function LeavesScreen() {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [employeeId, setEmployeeId] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [empRes, leavesRes] = await Promise.all([
      supabase.from('employees').select('*'),
      supabase
        .from('leaves')
        .select('*, employees(full_name)')
        .order('start_date', { ascending: false }),
    ]);
    if (empRes.error) Alert.alert('Error', empRes.error.message);
    else setEmployees(empRes.data);

    if (leavesRes.error) Alert.alert('Error', leavesRes.error.message);
    else setLeaves(leavesRes.data);
    setLoading(false);
  }

  async function handleAddLeave() {
    if (!employeeId || !startDate || !endDate || !reason) {
      Alert.alert('Validation', 'Please fill all fields and select an employee.');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Validation', 'End date must be on or after start date.');
      return;
    }
    const { error } = await supabase.from('leaves').insert([{
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
      reason,
      status: 'pending',
    }]);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Leave added');
      setEmployeeId(null); setStartDate(''); setEndDate(''); setReason('');
      fetchData();
    }
  }

  async function handleDelete(id) {
    Alert.alert('Confirm', 'Delete this leave record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('leaves').delete().eq('id', id);
          if (error) Alert.alert('Error', error.message);
          else fetchData();
        }
      },
    ]);
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('leaves').update({ status }).eq('id', id);
    if (error) Alert.alert('Error', error.message);
    else fetchData();
  }

  const statusColor = (s) => s === 'approved' ? '#2ECC71' : s === 'absent' ? '#E74C3C' : '#F39C12';

  return (
    <View style={styles.container}>
      <FlatList
        data={leaves}
        keyExtractor={item => item.id}
        ListEmptyComponent={!loading && <Text style={styles.empty}>No leave records yet.</Text>}
        ListHeaderComponent={
          <View style={styles.form}>
            {/* Employee selector */}
            <Text style={styles.label}>
              Select Employee: {employees.find(e => e.id === employeeId)?.full_name || 'None'}
            </Text>
            <FlatList
              horizontal
              data={employees}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              style={styles.empList}
              contentContainerStyle={styles.empListContent}
              renderItem={({ item }) => (
                <FlatButton
                  title={item.full_name}
                  onPress={() => setEmployeeId(item.id)}
                  color={employeeId === item.id ? '#3498DB' : '#BDC3C7'}
                  style={styles.empBtn}
                  textStyle={styles.empBtnText}
                />
              )}
            />

            {/* Date pickers */}
            <DatePickerField label="Pick Start Date" value={startDate} onChange={setStartDate} />
            <DatePickerField label="Pick End Date" value={endDate} onChange={setEndDate} />

            <FlatTextInput placeholder="Reason for leave" value={reason} onChangeText={setReason} />
            <FlatButton title="Add Leave" onPress={handleAddLeave} color="#2ECC71" />

            <Text style={styles.sectionTitle}>All Leave Records</Text>
          </View>
        }
        renderItem={({ item }) => (
          <FlatCard>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.employees?.full_name}</Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash" size={20} color="#E74C3C" />
              </TouchableOpacity>
            </View>
            <Text style={styles.details}>
              <Ionicons name="calendar-outline" size={13} /> {item.start_date} → {item.end_date}
            </Text>
            <Text style={styles.reason}>{item.reason}</Text>
            <Text style={[styles.status, { color: statusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
            {item.status === 'pending' && (
              <View style={styles.actions}>
                <FlatButton
                  title="✓ Approve"
                  onPress={() => updateStatus(item.id, 'approved')}
                  color="#2ECC71" style={styles.btn} textStyle={styles.btnText}
                />
                <FlatButton
                  title="✗ Absent"
                  onPress={() => updateStatus(item.id, 'absent')}
                  color="#E74C3C" style={styles.btn} textStyle={styles.btnText}
                />
              </View>
            )}
          </FlatCard>
        )}
      />
      {loading && <ActivityIndicator size="large" color="#E74C3C" style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  form: { marginBottom: 8 },
  label: { fontSize: 14, color: '#2C3E50', fontWeight: 'bold', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 8, color: '#2C3E50' },
  empBtn: { marginRight: 8, padding: 8, marginVertical: 0, marginBottom: 8, justifyContent: 'center', alignItems: 'center' },
  empBtnText: { fontSize: 14 },
  empList: {
    flexGrow: 0,
    marginBottom: 8,
  },
  empListContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  details: { fontSize: 13, color: '#7F8C8D', marginTop: 4 },
  reason: { fontSize: 14, color: '#E74C3C', marginTop: 4, fontStyle: 'italic' },
  status: { fontSize: 13, fontWeight: 'bold', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { padding: 8, flex: 1, marginVertical: 0 },
  btnText: { fontSize: 13 },
  empty: { textAlign: 'center', color: '#7F8C8D', marginTop: 32 },
  loader: { position: 'absolute', alignSelf: 'center', top: '50%' },
});
