import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, supabaseAdminCreate } from '../../lib/supabase';
import FlatCard from '../../components/FlatCard';
import FlatButton from '../../components/FlatButton';
import FlatTextInput from '../../components/FlatTextInput';
import { Ionicons } from '@expo/vector-icons';

const EMPTY_FORM = { id: null, full_name: '', phone_number: '', position: '', email: '', password: '', role: 'employee' };

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
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

  async function handleRefresh() {
    setRefreshing(true);
    await loadDefaultPosition();
    const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    if (error) Alert.alert('Error', error.message);
    else setEmployees(data);
    setRefreshing(false);
  }

  function openAddModal() {
    setForm({ ...EMPTY_FORM, position: defaultPositionRef.current });
    setModalVisible(true);
  }

  function openEditModal(item) {
    setForm({ ...item, password: '', email: item.email || '' });
    setModalVisible(true);
  }

  function closeModal() {
    setForm(EMPTY_FORM);
    setModalVisible(false);
  }

  async function handleSave() {
    const name = form.full_name ? form.full_name.trim() : '';
    const phone = form.phone_number ? form.phone_number.trim() : '';
    const position = form.position ? form.position.trim() : '';
    const email = form.email ? form.email.trim() : '';
    const password = form.password || '';
    const role = form.role || 'employee';

    if (!name || !phone || !position) {
      Alert.alert('Validation', 'Please fill in Name, Phone, and Position.');
      return;
    }

    if (phone.length !== 11) {
      Alert.alert('Validation', 'Phone number must be exactly 11 digits.');
      return;
    }

    if (!form.id && (!email || !password)) {
      Alert.alert('Validation', 'Please provide an Email and Password for the new user.');
      return;
    }

    setSubmitting(true);
    if (form.id) {
      // Update employee
      const updates = {
        full_name: name,
        phone_number: phone,
        position: position,
        role: role
      };
      if (email) updates.email = email;

      const { error } = await supabase.from('employees').update(updates).eq('id', form.id);
      if (error) Alert.alert('Error updating employee', error.message);
      else {
        Alert.alert('Success', 'Employee updated');
        closeModal();
        fetchEmployees();
      }
    } else {
      // 1. Create Auth User
      const { data: authData, error: authErr } = await supabaseAdminCreate.auth.signUp({
        email,
        password,
        options: {
          data: { role: role },
        },
      });

      if (authErr) {
        Alert.alert('Error creating auth user', authErr.message);
        setSubmitting(false);
        return;
      }

      // Supabase may return null user if email confirmation is enabled
      const newUserId = authData?.user?.id ?? null;

      if (!newUserId) {
        const { error } = await supabase.from('employees').insert([{
          full_name: name,
          phone_number: phone,
          position: position,
          email: email,
          role: role,
        }]);
        if (error) Alert.alert('Error inserting employee record', error.message);
        else {
          Alert.alert('Success', 'Employee added. Note: Email confirmation may be required before they can log in.');
          closeModal();
          fetchEmployees();
        }
      } else {
        const { error } = await supabase.from('employees').insert([{
          full_name: name,
          phone_number: phone,
          position: position,
          email: email,
          role: role,
          auth_id: newUserId
        }]);
        if (error) Alert.alert('Error inserting employee record', error.message);
        else {
          Alert.alert('Success', 'Employee added');
          closeModal();
          fetchEmployees();
        }
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
      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.8}>
        <Ionicons name="person-add" size={18} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.addBtnText}>Add Employee</Text>
      </TouchableOpacity>

      {/* Employee List */}
      {loading ? <ActivityIndicator size="large" color="#E74C3C" /> : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#3498DB"]} />
          }
          renderItem={({ item }) => (
            <FlatCard style={styles.cardRow}>
              <View style={styles.cardContent}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.details}>{item.position} | {item.phone_number}</Text>
                {item.role ? <Text style={styles.roleBadge}>{item.role.toUpperCase()}</Text> : null}
              </View>
              <View style={styles.actions}>
                <Ionicons name="pencil" size={24} color="#3498DB" onPress={() => openEditModal(item)} style={styles.icon} />
                <Ionicons name="trash" size={24} color="#E74C3C" onPress={() => handleDelete(item.id)} style={styles.icon} />
              </View>
            </FlatCard>
          )}
        />
      )}

      {/* Modal Form */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{form.id ? 'Edit Employee' : 'Add Employee'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <FlatTextInput placeholder="e.g. Dela Cruz, Juan A." value={form.full_name} onChangeText={(text) => setForm({...form, full_name: text})} />

              <Text style={styles.fieldLabel}>Phone Number *</Text>
              <FlatTextInput placeholder="e.g. 09123456789" value={form.phone_number} onChangeText={(text) => setForm({...form, phone_number: text.replace(/[^0-9]/g, '')})} keyboardType="phone-pad" maxLength={11} />

              <Text style={styles.fieldLabel}>Position *</Text>
              <FlatTextInput placeholder="e.g. ADMIN AIDE IV" value={form.position} onChangeText={(text) => setForm({...form, position: text})} />

              <View style={styles.divider} />

              <Text style={styles.fieldLabel}>Email (Login) {form.id ? '' : '*'}</Text>
              <FlatTextInput placeholder="e.g. juan@sked.com" value={form.email} onChangeText={(text) => setForm({...form, email: text})} autoCapitalize="none" keyboardType="email-address" />

              {!form.id && (
                <>
                  <Text style={styles.fieldLabel}>Password *</Text>
                  <FlatTextInput placeholder="Min 6 characters" value={form.password} onChangeText={(text) => setForm({...form, password: text})} secureTextEntry />
                </>
              )}

              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.roleRow}>
                {['employee', 'manager', 'admin'].map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, form.role === r && styles.roleChipActive]}
                    onPress={() => setForm({...form, role: r})}
                  >
                    <Text style={[styles.roleChipText, form.role === r && styles.roleChipTextActive]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <FlatButton title="Cancel" onPress={closeModal} color="#95A5A6" />
              <View style={{ width: 12 }} />
              <FlatButton title={form.id ? "Update" : "Add"} onPress={handleSave} color="#2ECC71" disabled={submitting} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },

  // Add Button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  // Cards
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardContent: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  details: { fontSize: 14, color: '#7F8C8D', marginTop: 4 },
  roleBadge: { fontSize: 11, fontWeight: 'bold', color: '#FFF', backgroundColor: '#7F8C8D', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  actions: { flexDirection: 'row' },
  icon: { marginLeft: 16 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  modalBody: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
  },

  // Fields
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#7F8C8D', marginBottom: 4, marginTop: 10 },
  divider: { height: 1, backgroundColor: '#ECF0F1', marginVertical: 12 },

  // Role chips
  roleRow: { flexDirection: 'row', marginTop: 6, gap: 8 },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#BDC3C7',
    backgroundColor: '#FFF',
  },
  roleChipActive: {
    borderColor: '#3498DB',
    backgroundColor: '#EBF5FB',
  },
  roleChipText: { fontSize: 13, fontWeight: '600', color: '#7F8C8D' },
  roleChipTextActive: { color: '#3498DB' },
});
