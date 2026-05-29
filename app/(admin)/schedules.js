import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FlatButton from '../../components/FlatButton';
import { supabase } from '../../lib/supabase';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'];

const DEFAULT_SHIFTS = [
  { id: 'market_shift_1', name: 'Market Shift 1', time: '4am - 12nn', color: '#2E7D32', bg: '#E8F5E9' },
  { id: 'market_shift_2', name: 'Market Shift 2', time: '8am - 4pm', color: '#1565C0', bg: '#E3F2FD' },
  { id: 'market_shift_3', name: 'Market Shift 3', time: '8pm - 4am', color: '#6A1B9A', bg: '#F3E5F5' },
  { id: 'market_shift_4', name: 'Market Shift 4', time: '10pm - 6am', color: '#E65100', bg: '#FFF3E0' }
];

export default function SchedulesScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthSchedule, setMonthSchedule] = useState({});
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [selectedShiftId, setSelectedShiftId] = useState('');

  useEffect(() => {
    fetchEmployees();
    loadShifts();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadEmployeeShift();
      loadExistingSchedule();
    }
  }, [selectedEmployeeId, currentDate]);

  async function loadShifts() {
    try {
      const stored = await AsyncStorage.getItem('sked_shifts');
      if (stored) {
        setShifts(JSON.parse(stored));
      } else {
        setShifts(DEFAULT_SHIFTS);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadEmployeeShift() {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const key = `sked_employee_shifts_${year}_${month}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const assignments = JSON.parse(stored);
        setSelectedShiftId(assignments[selectedEmployeeId] || '');
      } else {
        setSelectedShiftId('');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchEmployees() {
    setLoading(true);
    const { data, error } = await supabase.from('employees').select('*').order('full_name');
    if (error) Alert.alert('Error', error.message);
    else setEmployees(data);
    setLoading(false);
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let i = 1; i <= days; i++) {
      // noon to avoid any timezone shift
      const d = new Date(year, month, i, 12, 0, 0);
      result.push(d.toISOString().split('T')[0]);
    }
    return result;
  };

  const daysArray = getDaysInMonth(currentDate);

  // The weekday index (0=Sun) that the 1st of the month falls on
  const firstDayOffset = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  async function loadExistingSchedule() {
    setLoading(true);
    const defaultSchedule = {};
    daysArray.forEach(d => (defaultSchedule[d] = 'duty'));

    const startDate = daysArray[0];
    const endDate = daysArray[daysArray.length - 1];

    const { data, error } = await supabase
      .from('schedules')
      .select('work_date, shift_type')
      .eq('employee_id', selectedEmployeeId)
      .gte('work_date', startDate)
      .lte('work_date', endDate);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      data.forEach(item => {
        defaultSchedule[item.work_date] = item.shift_type;
      });
    }

    setMonthSchedule(defaultSchedule);
    setLoading(false);
  }

  const toggleDay = (dateStr) => {
    setMonthSchedule(prev => ({
      ...prev,
      [dateStr]: prev[dateStr] === 'duty' ? 'day_off' : 'duty',
    }));
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const dayOffs1To15 = daysArray.slice(0, 15).filter(d => monthSchedule[d] === 'day_off').length;
  const dayOffs16Plus = daysArray.slice(15).filter(d => monthSchedule[d] === 'day_off').length;
  const isValid = dayOffs1To15 === 2 && dayOffs16Plus === 2 && selectedShiftId !== '';

  async function saveSchedule() {
    if (!selectedShiftId) {
      Alert.alert('Validation Error', 'You must select a shift for this employee before saving.');
      return;
    }
    if (dayOffs1To15 !== 2 || dayOffs16Plus !== 2) {
      Alert.alert('Validation Error', 'Must have exactly 2 day offs in 1–15 and 2 day offs in 16+.');
      return;
    }
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const key = `sked_employee_shifts_${year}_${month}`;

      const stored = await AsyncStorage.getItem(key);
      const assignments = stored ? JSON.parse(stored) : {};
      assignments[selectedEmployeeId] = selectedShiftId;
      await AsyncStorage.setItem(key, JSON.stringify(assignments));

      const recordsToUpsert = daysArray.map(dateStr => ({
        employee_id: selectedEmployeeId,
        work_date: dateStr,
        shift_type: monthSchedule[dateStr],
      }));

      const { error } = await supabase
        .from('schedules')
        .upsert(recordsToUpsert, { onConflict: 'employee_id,work_date' });

      setLoading(false);
      if (error) Alert.alert('Error Saving', error.message);
      else Alert.alert('Success', 'Monthly schedule saved!');
    } catch (e) {
      setLoading(false);
      Alert.alert('Error Saving', e.message);
    }
  }

  // Build calendar cells: leading empty slots + day cells
  const calendarCells = [
    ...Array(firstDayOffset).fill(null),
    ...daysArray,
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Monthly Bulk Scheduler</Text>

      {/* Employee selector */}
      <Text style={styles.label}>Select Employee:</Text>
      <FlatList
        horizontal
        data={employees}
        keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.empList}
        contentContainerStyle={styles.empListContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => setSelectedEmployeeId(item.id)}
            style={[
              styles.empBtn,
              { backgroundColor: selectedEmployeeId === item.id ? '#3498DB' : '#BDC3C7' },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.empBtnText}>{item.full_name}</Text>
          </TouchableOpacity>
        )}
      />


      {selectedEmployeeId && (
        <View style={{ flex: 1 }}>
          {/* Month navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Shift Selector */}
          <Text style={styles.subLabel}>Assign Active Shift for {currentDate.toLocaleString('default', { month: 'long' })}:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.shiftScroll}
            contentContainerStyle={styles.shiftScrollContent}
          >
            {shifts.map(shift => {
              const isSelected = selectedShiftId === shift.id;
              return (
                <TouchableOpacity
                  key={shift.id}
                  onPress={() => setSelectedShiftId(shift.id)}
                  style={[
                    styles.shiftBtn,
                    {
                      backgroundColor: isSelected ? (shift.color || '#3498DB') : '#F0F3F4',
                      borderColor: isSelected ? (shift.color || '#3498DB') : '#BDC3C7',
                    }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.shiftBtnText, { color: isSelected ? '#FFF' : '#2C3E50' }]}>
                    {shift.name}
                  </Text>
                  <Text style={[styles.shiftBtnTime, { color: isSelected ? '#EAECEE' : '#7F8C8D' }]}>
                    {shift.time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Day-off counters */}
          <View style={styles.counters}>
            <Text style={[styles.counterText, { color: dayOffs1To15 === 2 ? '#2ECC71' : '#E74C3C' }]}>
              Day Offs (1-15): {dayOffs1To15}/2
            </Text>
            <Text style={[styles.counterText, { color: dayOffs16Plus === 2 ? '#2ECC71' : '#E74C3C' }]}>
              Day Offs (16+): {dayOffs16Plus}/2
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#3498DB" style={{ flex: 1 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Weekday header row */}
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((wd, i) => (
                  <View key={i} style={styles.weekdayCell}>
                    <Text style={styles.weekdayText}>{wd}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.grid}>
                {calendarCells.map((dateStr, idx) => {
                  if (!dateStr) {
                    // Empty leading cell
                    return <View key={`empty-${idx}`} style={styles.dayCell} />;
                  }
                  const dayNum = parseInt(dateStr.split('-')[2], 10);
                  const isOff = monthSchedule[dateStr] === 'day_off';
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[styles.dayCell, isOff ? styles.dayCellOff : styles.dayCellDuty]}
                      onPress={() => toggleDay(dateStr)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dayNum}>{dayNum}</Text>
                      <Text style={styles.dayStatus}>{isOff ? 'OFF' : 'DUTY'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <FlatButton
            title="Save Monthly Schedule"
            onPress={saveSchedule}
            color="#2ECC71"
            disabled={!isValid || loading}
          />
        </View>
      )}
    </View>
  );
}

const CELL_SIZE = '13%';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12 },
  label: { fontSize: 14, color: '#2C3E50', fontWeight: 'bold', marginBottom: 8 },
  empBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empBtnText: { fontSize: 14, color: '#FFF', fontWeight: 'bold' },
  empList: {
    flexGrow: 0,
    marginBottom: 12,
  },
  empListContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },

  monthNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  navBtn: { backgroundColor: '#3498DB', padding: 8, borderRadius: 8 },
  monthText: { fontSize: 17, fontWeight: 'bold', color: '#2C3E50' },

  counters: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#ECF0F1', padding: 12, borderRadius: 8, marginBottom: 12,
  },
  counterText: { fontSize: 13, fontWeight: 'bold' },

  // Weekday header
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayCell: { width: CELL_SIZE, marginHorizontal: '0.5%', alignItems: 'center' },
  weekdayText: { fontSize: 12, fontWeight: 'bold', color: '#7F8C8D' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: CELL_SIZE,
    aspectRatio: 1,
    marginHorizontal: '0.5%',
    marginBottom: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellDuty: { backgroundColor: '#3498DB' },
  dayCellOff: { backgroundColor: '#E74C3C' },
  dayNum: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  dayStatus: { fontSize: 9, color: '#FFF', fontWeight: 'bold', marginTop: 2 },

  subLabel: { fontSize: 13, color: '#7F8C8D', fontWeight: 'bold', marginBottom: 8, marginTop: 4 },
  shiftScroll: { flexGrow: 0, marginBottom: 12 },
  shiftScrollContent: { paddingVertical: 4 },
  shiftBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  shiftBtnText: { fontSize: 13, fontWeight: 'bold' },
  shiftBtnTime: { fontSize: 10, marginTop: 2, fontWeight: '500' },
});
