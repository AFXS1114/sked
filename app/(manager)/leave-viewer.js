import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import FlatCard from '../../components/FlatCard';
import FlatButton from '../../components/FlatButton';
import { Ionicons } from '@expo/vector-icons';

export default function LeaveViewerScreen() {
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'approved'

  useEffect(() => {
    fetchLeaves();
  }, []);

  async function fetchLeaves() {
    setLoading(true);
    const { data, error } = await supabase
      .from('leaves')
      .select('*, employees(full_name)')
      .order('start_date', { ascending: false });

    if (!error && data) {
      setLeaves(data);
    } else if (error) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from('leaves')
      .update({ status })
      .eq('id', id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', `Leave request successfully ${status}.`);
      fetchLeaves();
    }
  }

  const filteredLeaves = leaves.filter(l => l.status === activeTab);

  return (
    <View style={styles.container}>
      {/* Segmented Controls / Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'pending' && styles.activeTabButton]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({leaves.filter(l => l.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'approved' && styles.activeTabButton]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
            Approved ({leaves.filter(l => l.status === 'approved').length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3498DB" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={filteredLeaves}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {activeTab === 'pending' ? 'No pending leave approvals.' : 'No approved leaves found.'}
            </Text>
          }
          renderItem={({ item }) => {
            const isPending = item.status === 'pending';
            return (
              <FlatCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.iconWrapper, { backgroundColor: isPending ? '#FEF9E7' : '#E8F8F5' }]}>
                      <Ionicons 
                        name="umbrella" 
                        size={20} 
                        color={isPending ? '#F39C12' : '#2ECC71'} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{item.employees?.full_name}</Text>
                      <Text style={styles.details}>{item.start_date} to {item.end_date}</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reason}>{item.reason}</Text>

                {isPending && (
                  <View style={styles.actions}>
                    <FlatButton
                      title="✗ Reject"
                      onPress={() => {
                        Alert.alert('Confirm', 'Mark this employee as absent / reject request?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Reject', onPress: () => updateStatus(item.id, 'absent'), style: 'destructive' }
                        ]);
                      }}
                      color="#E74C3C"
                      style={styles.actionBtn}
                      textStyle={styles.btnText}
                    />
                    <FlatButton
                      title="✓ Approve"
                      onPress={() => {
                        Alert.alert('Confirm', 'Approve this leave request?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Approve', onPress: () => updateStatus(item.id, 'approved') }
                        ]);
                      }}
                      color="#2ECC71"
                      style={styles.actionBtn}
                      textStyle={styles.btnText}
                    />
                  </View>
                )}
              </FlatCard>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEDED',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  activeTabText: {
    color: '#3498DB',
  },
  card: {
    padding: 16,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  details: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  reasonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#95A5A6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  reason: { 
    fontSize: 14, 
    color: '#34495E', 
    marginTop: 4, 
    fontStyle: 'italic',
    lineHeight: 20,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    marginVertical: 0,
    borderRadius: 8,
  },
  btnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  empty: { textAlign: 'center', marginTop: 32, color: '#7F8C8D', fontSize: 14 }
});
