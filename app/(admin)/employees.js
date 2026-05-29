import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import FlatCard from '../../components/FlatCard';
import FlatButton from '../../components/FlatButton';
import FlatTextInput from '../../components/FlatTextInput';
import { Ionicons } from '@expo/vector-icons';

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ id: null, full_name: '', phone_number: '', position: '' });
  const [submitting, setSubmitting] = useState(false);
  const defaultPositionRef = useRef('');

  useEffect(() => {
    fetchEmployees();
    loadDefaultPosition();
  }, []);

  async function loadDefaultPosition() {
    try {
      const stored = await AsyncStorage.getItem('sked_default_position');
      if (stored) {
        defaultPositionRef.current = stored;
        // Only prefill if not currently editing an existing employee
        setForm(prev => prev.id ? prev : { ...prev, position: stored });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchEmployees() {
    setLoading(true);
    const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    if (error) Alert.alert('Error', error.message);
    else setEmployees(data);
    setLoading(false);
  }

  async function handleSave() {
    const name = form.full_name ? form.full_name.trim() : '';
    const phone = form.phone_number ? form.phone_number.trim() : '';
    const position = form.position ? form.position.trim() : '';

    if (!name || !phone || !position) {
      Alert.alert('Validation', 'Please fill in all fields (cannot be empty).');
      return;
    }

    if (phone.length !== 11) {
      Alert.alert('Validation', 'Phone number must be exactly 11 digits.');
      return;
    }

    setSubmitting(true);
    if (form.id) {
      const { error } = await supabase.from('employees').update({
        full_name: name,
        phone_number: phone,
        position: position
      }).eq('id', form.id);
      if (error) Alert.alert('Error', error.message);
      else {
        Alert.alert('Success', 'Employee updated');
        setForm({ id: null, full_name: '', phone_number: '', position: defaultPositionRef.current });
        fetchEmployees();
      }
    } else {
      const { error } = await supabase.from('employees').insert([{
        full_name: name,
        phone_number: phone,
        position: position
      }]);
      if (error) Alert.alert('Error', error.message);
      else {
        Alert.alert('Success', 'Employee added');
        setForm({ id: null, full_name: '', phone_number: '', position: defaultPositionRef.current });
        fetchEmployees();
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(id) {
    Alert.alert('Confirm', 'Delete employee?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', onPress: async () => {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) Alert.alert('Error', error.message);
        else fetchEmployees();
      }, style: 'destructive'}
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <FlatTextInput placeholder="Full Name" value={form.full_name} onChangeText={(text) => setForm({...form, full_name: text})} />
        <FlatTextInput placeholder="Phone Number" value={form.phone_number} onChangeText={(text) => setForm({...form, phone_number: text.replace(/[^0-9]/g, '')})} keyboardType="phone-pad" maxLength={11} />
        <FlatTextInput placeholder="Position" value={form.position} onChangeText={(text) => setForm({...form, position: text})} />
        <FlatButton title={form.id ? "Update Employee" : "Add Employee"} onPress={handleSave} color="#2ECC71" disabled={submitting} />
        {form.id && <FlatButton title="Cancel Edit" onPress={() => setForm({ id: null, full_name: '', phone_number: '', position: defaultPositionRef.current })} color="#95A5A6" />}
      </View>

      {loading ? <ActivityIndicator size="large" color="#E74C3C" /> : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FlatCard style={styles.cardRow}>
              <View style={styles.cardContent}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.details}>{item.position} | {item.phone_number}</Text>
              </View>
              <View style={styles.actions}>
                <Ionicons name="pencil" size={24} color="#3498DB" onPress={() => setForm(item)} style={styles.icon} />
                <Ionicons name="trash" size={24} color="#E74C3C" onPress={() => handleDelete(item.id)} style={styles.icon} />
              </View>
            </FlatCard>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  form: { marginBottom: 24 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardContent: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  details: { fontSize: 14, color: '#7F8C8D', marginTop: 4 },
  actions: { flexDirection: 'row' },
  icon: { marginLeft: 16 }
});
