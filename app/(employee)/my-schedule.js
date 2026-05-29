import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import FlatCard from '../../components/FlatCard';
import FlatButton from '../../components/FlatButton';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useNavigation } from 'expo-router';

export default function MyScheduleScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userShift, setUserShift] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (selectedEmployeeId) {
        refreshData(selectedEmployeeId);
      }
    });
    return unsubscribe;
  }, [navigation, selectedEmployeeId]);

  async function fetchEmployees() {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').order('full_name');
    if (data) setEmployees(data);
    setLoading(false);
  }

  async function loadShiftsAndAssignment(empId) {
    try {
      const storedShifts = await AsyncStorage.getItem('sked_shifts');
      const activeShifts = storedShifts ? JSON.parse(storedShifts) : [
        { id: 'market_shift_1', name: 'Market Shift 1', time: '4am - 12nn', color: '#2E7D32', bg: '#E8F5E9' },
        { id: 'market_shift_2', name: 'Market Shift 2', time: '8am - 4pm', color: '#1565C0', bg: '#E3F2FD' },
        { id: 'market_shift_3', name: 'Market Shift 3', time: '8pm - 4am', color: '#6A1B9A', bg: '#F3E5F5' },
        { id: 'market_shift_4', name: 'Market Shift 4', time: '10pm - 6am', color: '#E65100', bg: '#FFF3E0' }
      ];
      
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const shiftKey = `sked_employee_shifts_${year}_${month}`;
      const storedEmpShifts = await AsyncStorage.getItem(shiftKey);
      const activeEmpShifts = storedEmpShifts ? JSON.parse(storedEmpShifts) : {};
      
      const assignedShiftId = activeEmpShifts[empId];
      if (assignedShiftId) {
        const matched = activeShifts.find(s => s.id === assignedShiftId);
        setUserShift(matched || null);
      } else {
        setUserShift(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchMySchedule(id) {
    setSelectedEmployeeId(id);
    setLoading(true);
    await loadShiftsAndAssignment(id);
    const [schedRes, leavesRes] = await Promise.all([
      supabase
        .from('schedules')
        .select('*')
        .eq('employee_id', id)
        .order('work_date', { ascending: true }),
      supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', id)
        .order('start_date', { ascending: false })
    ]);
    
    if (schedRes.data) setSchedules(schedRes.data);
    if (leavesRes.data) setLeaves(leavesRes.data);
    setLoading(false);
  }

  async function refreshData(id) {
    const [schedRes, leavesRes] = await Promise.all([
      supabase
        .from('schedules')
        .select('*')
        .eq('employee_id', id)
        .order('work_date', { ascending: true }),
      supabase
        .from('leaves')
        .select('*')
        .eq('employee_id', id)
        .order('start_date', { ascending: false })
    ]);
    if (schedRes.data) setSchedules(schedRes.data);
    if (leavesRes.data) setLeaves(leavesRes.data);
  }

  const getOverlappingLeave = (dateStr) => {
    if (!leaves || leaves.length === 0) return null;
    return leaves.find(l => dateStr >= l.start_date && dateStr <= l.end_date);
  };

  if (!selectedEmployeeId) {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Who are you?</Text>
        {loading ? <ActivityIndicator size="large" color="#2ECC71" /> : (
          <FlatList
            data={employees}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <FlatButton 
                title={item.full_name} 
                onPress={() => fetchMySchedule(item.id)} 
                color="#3498DB" 
              />
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2ECC71" style={{ marginTop: 64 }} />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No schedules assigned.</Text>}
          ListHeaderComponent={
            <View>
              {/* Action Buttons Row */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                <FlatButton 
                  title="Switch User" 
                  onPress={() => { setSelectedEmployeeId(null); setUserShift(null); setLeaves([]); }} 
                  color="#95A5A6" 
                  style={{ flex: 1, marginVertical: 0 }}
                />
                <FlatButton 
                  title="File a Leave" 
                  onPress={() => router.push({ pathname: '/(employee)/file-leave', params: { employeeId: selectedEmployeeId } })} 
                  color="#2ECC71" 
                  style={{ flex: 1, marginVertical: 0 }}
                />
              </View>
              
              {/* Active Monthly Shift */}
              {userShift && (
                <FlatCard style={[styles.shiftCard, { backgroundColor: userShift.bg || '#E8F5E9', borderColor: userShift.color || '#2E7D32' }]}>
                  <Ionicons name="time" size={24} color={userShift.color || '#2E7D32'} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.shiftCardLabel, { color: userShift.color || '#2E7D32' }]}>Your Active Shift This Month:</Text>
                    <Text style={[styles.shiftCardName, { color: userShift.color || '#2E7D32' }]}>{userShift.name}</Text>
                    <Text style={[styles.shiftCardTime, { color: userShift.color || '#2E7D32' }]}>{userShift.time}</Text>
                  </View>
                </FlatCard>
              )}

              {/* My Leave Requests Section */}
              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>My Leave Requests</Text>
              {leaves.length === 0 ? (
                <FlatCard style={{ alignItems: 'center', padding: 16, marginBottom: 16 }}>
                  <Text style={{ color: '#7F8C8D' }}>No leave requests filed yet.</Text>
                </FlatCard>
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={leaves}
                  keyExtractor={item => item.id}
                  style={{ marginBottom: 16 }}
                  renderItem={({ item }) => {
                    const statusColor = item.status === 'approved' ? '#2ECC71' : item.status === 'absent' ? '#E74C3C' : '#F39C12';
                    const statusBg = item.status === 'approved' ? '#E8F8F5' : item.status === 'absent' ? '#FDEDEC' : '#FEF9E7';
                    return (
                      <View style={[styles.leaveCard, { borderColor: statusColor }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
                          </View>
                          <Ionicons name="umbrella" size={18} color={statusColor} />
                        </View>
                        <Text style={styles.leaveDates}>{item.start_date} to {item.end_date}</Text>
                        <Text style={styles.leaveReason} numberOfLines={2}>{item.reason}</Text>
                      </View>
                    );
                  }}
                />
              )}

              <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
            </View>
          }
          renderItem={({ item }) => {
            const overlappingLeave = getOverlappingLeave(item.work_date);
            const isDuty = item.shift_type === 'duty';
            
            let iconName = isDuty ? "briefcase" : "bed";
            let iconColor = isDuty ? (userShift?.color || '#3498DB') : '#95A5A6';
            let iconBg = isDuty ? (userShift?.bg || '#E3F2FD') : '#EAEDED';
            let subtitleText = isDuty ? `On Duty — ${userShift?.name || 'Assigned Shift'}` : 'Day Off';
            
            if (overlappingLeave) {
              iconName = "umbrella";
              const status = overlappingLeave.status;
              if (status === 'approved') {
                iconColor = '#2ECC71';
                iconBg = '#E8F8F5';
                subtitleText = `On Approved Leave — ${overlappingLeave.reason}`;
              } else if (status === 'absent') {
                iconColor = '#E74C3C';
                iconBg = '#FDEDEC';
                subtitleText = `Marked Absent — ${overlappingLeave.reason}`;
              } else {
                iconColor = '#F39C12';
                iconBg = '#FEF9E7';
                subtitleText = `Leave Pending Approval — ${overlappingLeave.reason}`;
              }
            }
            
            return (
              <FlatCard style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                  <Ionicons name={iconName} size={20} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.date}>{item.work_date}</Text>
                  <Text style={styles.shiftType}>{subtitleText}</Text>
                </View>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16, textAlign: 'center', marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12, marginTop: 8 },
  date: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  shiftType: { fontSize: 14, color: '#7F8C8D', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 24, color: '#7F8C8D' },
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  shiftCardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  shiftCardName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shiftCardTime: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  
  // Leaves styles
  leaveCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: 220,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  leaveDates: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  leaveReason: {
    fontSize: 12,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
});
