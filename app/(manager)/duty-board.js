import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import FlatCard from '../../components/FlatCard';
import BiometricSettings from '../../components/BiometricSettings';

import { supabase } from '../../lib/supabase';

export default function DutyBoardScreen() {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onDuty, setOnDuty] = useState([]);
  const [dayOff, setDayOff] = useState([]);
  const [onLeave, setOnLeave] = useState([]);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSchedules, setEmployeeSchedules] = useState([]);
  const [employeeLeaves, setEmployeeLeaves] = useState([]);
  const [employeeShift, setEmployeeShift] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);


  useEffect(() => {
    fetchSchedules();
  }, []);

  async function fetchSchedules() {
    setLoading(true);
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const [schedRes, leavesRes] = await Promise.all([
      supabase
        .from('schedules')
        .select('*, employees(full_name, position)')
        .eq('work_date', today),
      supabase
        .from('leaves')
        .select('*, employees(full_name, position)')
        .lte('start_date', today)
        .gte('end_date', today)
        .eq('status', 'approved')
    ]);

    if (!schedRes.error && !leavesRes.error) {
      const leaves = leavesRes.data || [];
      const schedules = schedRes.data || [];

      const onLeaveEmpIds = leaves.map(l => l.employee_id);
      
      const activeSchedules = schedules.filter(s => !onLeaveEmpIds.includes(s.employee_id));

      setOnDuty(activeSchedules.filter(s => s.shift_type === 'duty'));
      setDayOff(activeSchedules.filter(s => s.shift_type === 'day_off'));
      
      setOnLeave(leaves.map(l => ({
        id: `leave_${l.id}`,
        employee_id: l.employee_id,
        shift_type: 'on_leave',
        employees: l.employees,
      })));
    }
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const [schedRes, leavesRes] = await Promise.all([
      supabase
        .from('schedules')
        .select('*, employees(full_name, position)')
        .eq('work_date', today),
      supabase
        .from('leaves')
        .select('*, employees(full_name, position)')
        .lte('start_date', today)
        .gte('end_date', today)
        .eq('status', 'approved')
    ]);

    if (!schedRes.error && !leavesRes.error) {
      const leaves = leavesRes.data || [];
      const schedules = schedRes.data || [];
      const onLeaveEmpIds = leaves.map(l => l.employee_id);
      const activeSchedules = schedules.filter(s => !onLeaveEmpIds.includes(s.employee_id));

      setOnDuty(activeSchedules.filter(s => s.shift_type === 'duty'));
      setDayOff(activeSchedules.filter(s => s.shift_type === 'day_off'));
      setOnLeave(leaves.map(l => ({
        id: `leave_${l.id}`,
        employee_id: l.employee_id,
        shift_type: 'on_leave',
        employees: l.employees,
      })));
    }
    setRefreshing(false);
  }

  const getOverlappingLeave = (dateStr) => {
    if (!employeeLeaves || employeeLeaves.length === 0) return null;
    return employeeLeaves.find(l => dateStr >= l.start_date && dateStr <= l.end_date);
  };

  async function handleSelectEmployee(employee, employeeId) {
    if (!employee || !employeeId) return;

    setSelectedEmployee({ id: employeeId, ...employee });
    setModalVisible(true);
    setModalLoading(true);
    setEmployeeShift(null);
    setEmployeeSchedules([]);
    setEmployeeLeaves([]);

    try {
      // 1. Fetch active shift from AsyncStorage
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
      const shiftkey = `sked_employee_shifts_${year}_${month}`;
      const storedEmpShifts = await AsyncStorage.getItem(shiftkey);
      const activeEmpShifts = storedEmpShifts ? JSON.parse(storedEmpShifts) : {};

      const assignedShiftId = activeEmpShifts[employeeId];
      if (assignedShiftId) {
        const matched = activeShifts.find(s => s.id === assignedShiftId);
        setEmployeeShift(matched || null);
      }

      // 2. Fetch schedules and leaves from Supabase
      const [schedRes, leavesRes] = await Promise.all([
        supabase
          .from('schedules')
          .select('*')
          .eq('employee_id', employeeId)
          .order('work_date', { ascending: true }),
        supabase
          .from('leaves')
          .select('*')
          .eq('employee_id', employeeId)
          .order('start_date', { ascending: false })
      ]);

      if (schedRes.error) {
        Alert.alert('Error', schedRes.error.message);
      } else {
        if (schedRes.data) setEmployeeSchedules(schedRes.data);
        if (leavesRes.data) setEmployeeLeaves(leavesRes.data);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load employee details');
    } finally {
      setModalLoading(false);
    }
  }

  const renderItem = ({ item }) => {
    let iconName = "briefcase";
    let iconColor = "#3498DB";
    if (item.shift_type === 'day_off') {
      iconName = "bed";
      iconColor = "#95A5A6";
    } else if (item.shift_type === 'on_leave') {
      iconName = "umbrella";
      iconColor = "#2ECC71";
    }

    return (
      <TouchableOpacity onPress={() => handleSelectEmployee(item.employees, item.employee_id)} activeOpacity={0.7}>
        <FlatCard style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={iconName} size={24} color={iconColor} style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.employees?.full_name}</Text>
            <Text style={styles.position}>{item.employees?.position}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
        </FlatCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#3498DB"]} />
        }
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.headerTitle, { marginBottom: 0 }]}>On Duty ({onDuty.length})</Text>
            <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={{ padding: 4 }}>
              <Ionicons name="settings-outline" size={22} color="#3498DB" />
            </TouchableOpacity>
          </View>
          {loading && !refreshing ? <ActivityIndicator size="large" color="#3498DB" style={{ marginVertical: 20 }} /> : (
            <View>
              {onDuty.map(item => (
                <View key={item.id}>{renderItem({ item })}</View>
              ))}
              {onDuty.length === 0 && <Text style={{ color: '#7F8C8D', textAlign: 'center', marginVertical: 10 }}>No one on duty today</Text>}
            </View>
          )}

          <Text style={[styles.headerTitle, { marginTop: 16 }]}>Day Off ({dayOff.length})</Text>
          {loading && !refreshing ? <ActivityIndicator size="large" color="#3498DB" style={{ marginVertical: 20 }} /> : (
            <View>
              {dayOff.map(item => (
                <View key={item.id}>{renderItem({ item })}</View>
              ))}
              {dayOff.length === 0 && <Text style={{ color: '#7F8C8D', textAlign: 'center', marginVertical: 10 }}>No one on day off today</Text>}
            </View>
          )}

          <Text style={[styles.headerTitle, { marginTop: 16 }]}>On Leave ({onLeave.length})</Text>
          {loading && !refreshing ? <ActivityIndicator size="large" color="#3498DB" style={{ marginVertical: 20 }} /> : (
            <View>
              {onLeave.map(item => (
                <View key={item.id}>{renderItem({ item })}</View>
              ))}
              {onLeave.length === 0 && <Text style={{ color: '#7F8C8D', textAlign: 'center', marginVertical: 10 }}>No one on leave today</Text>}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Employee Schedule Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEmployee && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedEmployee.full_name}</Text>
                    <Text style={styles.modalSubtitle}>{selectedEmployee.position}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeIconButton}>
                    <Ionicons name="close" size={24} color="#7F8C8D" />
                  </TouchableOpacity>
                </View>

                {modalLoading ? (
                  <ActivityIndicator size="large" color="#3498DB" style={{ marginVertical: 32 }} />
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%', marginBottom: 16 }}>
                    {employeeShift ? (
                      <View style={[styles.modalShiftCard, { backgroundColor: employeeShift.bg || '#E8F5E9', borderColor: employeeShift.color || '#2E7D32' }]}>
                        <Ionicons name="time" size={24} color={employeeShift.color || '#2E7D32'} style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalShiftLabel, { color: employeeShift.color || '#2E7D32' }]}>Active Monthly Shift</Text>
                          <Text style={[styles.modalShiftName, { color: employeeShift.color || '#2E7D32' }]}>{employeeShift.name}</Text>
                          <Text style={[styles.modalShiftTime, { color: employeeShift.color || '#2E7D32' }]}>{employeeShift.time}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.noShiftCard}>
                        <Ionicons name="time-outline" size={24} color="#7F8C8D" style={{ marginRight: 12 }} />
                        <Text style={styles.noShiftText}>No custom shift assigned this month</Text>
                      </View>
                    )}

                    <Text style={styles.modalSectionTitle}>Schedule Details</Text>
                    {employeeSchedules.length === 0 ? (
                      <Text style={styles.modalEmpty}>No schedules assigned yet.</Text>
                    ) : (
                      employeeSchedules.map((sched) => {
                        const overlappingLeave = getOverlappingLeave(sched.work_date);
                        const isDuty = sched.shift_type === 'duty';

                        let iconName = isDuty ? "briefcase" : "bed";
                        let iconColor = isDuty ? (employeeShift?.color || '#3498DB') : '#95A5A6';
                        let iconBg = isDuty ? (employeeShift?.bg || '#E3F2FD') : '#EAEDED';
                        let subtitleText = isDuty ? `On Duty — ${employeeShift?.name || 'Standard Shift'}` : 'Day Off';

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

                        const isToday = sched.work_date === todayStr;
                        const isDayOff = sched.shift_type !== 'duty' && !overlappingLeave;

                        return (
                          <View key={sched.id} style={[
                            styles.scheduleItem,
                            isToday && styles.todayScheduleItem,
                            isDayOff && !isToday && styles.dayOffScheduleItem,
                          ]}>
                            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                              <Ionicons name={iconName} size={18} color={iconColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[
                                  styles.scheduleDate,
                                  isToday && styles.todayScheduleDate,
                                  isDayOff && !isToday && styles.dayOffScheduleDate,
                                ]}>{sched.work_date}</Text>
                                {isToday && (
                                  <View style={styles.todayBadge}>
                                    <Text style={styles.todayBadgeText}>TODAY</Text>
                                  </View>
                                )}
                                {isDayOff && !isToday && (
                                  <View style={styles.dayOffBadge}>
                                    <Text style={styles.dayOffBadgeText}>DAY OFF</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.scheduleType}>{subtitleText}</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                )}

                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* App Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Device Settings</Text>
                <Text style={styles.modalSubtitle}>Configure local application security</Text>
              </View>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={styles.closeIconButton}>
                <Ionicons name="close" size={24} color="#7F8C8D" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%', marginBottom: 16 }}>
              <BiometricSettings />
            </ScrollView>
            <TouchableOpacity
              onPress={() => setSettingsModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  position: { fontSize: 14, color: '#7F8C8D' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 62, 80, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2,
  },
  closeIconButton: {
    padding: 4,
  },
  modalShiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    width: '100%',
  },
  modalShiftLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalShiftName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalShiftTime: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  noShiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    width: '100%',
  },
  noShiftText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
    marginTop: 4,
  },
  modalEmpty: {
    textAlign: 'center',
    color: '#95A5A6',
    marginVertical: 16,
    fontSize: 14,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F4',
    width: '100%',
    paddingHorizontal: 8,
  },
  todayScheduleItem: {
    backgroundColor: '#F0F8FF',
    borderColor: '#3498DB',
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  todayScheduleDate: {
    color: '#2980B9',
  },
  todayBadge: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  todayBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dayOffScheduleItem: {
    backgroundColor: '#FFF8F0',
    borderColor: '#E67E22',
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dayOffScheduleDate: {
    color: '#CA6F1E',
  },
  dayOffBadge: {
    backgroundColor: '#E67E22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  dayOffBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scheduleDate: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scheduleType: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  modalCloseButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
