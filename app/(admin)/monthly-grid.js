import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_SHIFTS = [
  { id: 'market_shift_1', name: 'Market Shift 1', time: '4am - 12nn', color: '#2E7D32', bg: '#E8F5E9' },
  { id: 'market_shift_2', name: 'Market Shift 2', time: '8am - 4pm', color: '#1565C0', bg: '#E3F2FD' },
  { id: 'market_shift_3', name: 'Market Shift 3', time: '8pm - 4am', color: '#6A1B9A', bg: '#F3E5F5' },
  { id: 'market_shift_4', name: 'Market Shift 4', time: '10pm - 6am', color: '#E65100', bg: '#FFF3E0' }
];

const DEMO_EMPLOYEES = [
  { full_name: 'Brogada, Alvin M.', position: 'ADMIN AIDE IV', shift: 'market_shift_1', offDay: 0 },
  { full_name: 'Besustringue, Dee Jay M.', position: 'ADMIN AIDE IV', shift: 'market_shift_1', offDay: 6 },
  { full_name: 'Gozarin, Josephine G.', position: 'ADMIN AIDE IV', shift: 'market_shift_1', offDay: 5 },
  { full_name: 'Gojit, Ricky G.', position: 'ADMIN AIDE IV', shift: 'market_shift_1', offDay: 4 },
  { full_name: 'Hugo, Joseph Abel R.', position: 'ADMIN AIDE IV', shift: 'market_shift_1', offDay: 3 },
  { full_name: 'Duma, Roland G.', position: 'ADMIN AIDE IV', shift: 'market_shift_2', offDay: 0 },
  { full_name: 'Guetan, Myrna G.', position: 'ADMIN AIDE IV', shift: 'market_shift_3', offDay: 2 },
  { full_name: 'Hilario, Charlene D.', position: 'ADMIN AIDE IV', shift: 'market_shift_3', offDay: 1 },
  { full_name: 'Lagadia, Carlo O.', position: 'ADMIN AIDE IV', shift: 'market_shift_4', offDay: 5 },
  { full_name: 'Calupit, Rouden H.', position: 'ADMIN AIDE IV', shift: 'market_shift_4', offDay: 4 },
  { full_name: 'Calupit, Romeo II A.', position: 'ADMIN AIDE IV', shift: 'market_shift_4', offDay: 3 },
];

export default function MonthlyGridScreen() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // Default to April 2026 to showcase seed data
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [employeeShifts, setEmployeeShifts] = useState({});

  useEffect(() => {
    fetchGridData();
  }, [currentDate]);

  async function fetchGridData() {
    setLoading(true);
    try {
      // 1. Fetch active shifts from AsyncStorage
      const storedShifts = await AsyncStorage.getItem('sked_shifts');
      const activeShifts = storedShifts ? JSON.parse(storedShifts) : DEFAULT_SHIFTS;
      setShifts(activeShifts);

      // 2. Fetch employee shift assignments for this month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const shiftKey = `sked_employee_shifts_${year}_${month}`;
      const storedEmpShifts = await AsyncStorage.getItem(shiftKey);
      const activeEmpShifts = storedEmpShifts ? JSON.parse(storedEmpShifts) : {};
      setEmployeeShifts(activeEmpShifts);

      // 3. Fetch all employees from Supabase
      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .order('full_name');
      if (empErr) throw empErr;

      // 4. Fetch schedules for this month
      const days = getDaysInMonth(currentDate);
      const startDate = days[0];
      const endDate = days[days.length - 1];

      const { data: scheds, error: schedErr } = await supabase
        .from('schedules')
        .select('employee_id, work_date, shift_type')
        .gte('work_date', startDate)
        .lte('work_date', endDate);
      if (schedErr) throw schedErr;

      // Map schedules to lookup: employee_id -> { work_date -> shift_type }
      const schedLookup = {};
      scheds.forEach(s => {
        if (!schedLookup[s.employee_id]) {
          schedLookup[s.employee_id] = {};
        }
        schedLookup[s.employee_id][s.work_date] = s.shift_type;
      });

      setEmployees(emps);
      setSchedules(schedLookup);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let i = 1; i <= numDays; i++) {
      const d = new Date(year, month, i, 12, 0, 0);
      result.push(d.toISOString().split('T')[0]);
    }
    return result;
  };

  const daysArray = getDaysInMonth(currentDate);

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const generateHTML = () => {
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    let html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #2C3E50; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
            th, td { border: 1px solid #BDC3C7; text-align: center; padding: 4px; }
            th { background-color: #F8F9FA; font-weight: bold; }
            .personnel { text-align: left; padding-left: 8px; width: 150px; font-weight: bold; }
            .sunday { background-color: #FFEBEE; color: #C62828; }
            .shift-header { background-color: #EAEDED; font-weight: bold; text-align: left; padding: 6px; }
            .off-day { font-weight: bold; color: #C62828; }
            /* Force table cells to break nicely */
            td { min-width: 25px; }
          </style>
        </head>
        <body>
          <h1>Schedule for ${monthName}</h1>
          <table>
            <thead>
              <tr>
                <th class="personnel">PERSONNEL</th>
    `;

    daysArray.forEach((dateStr, idx) => {
      const dayNum = idx + 1;
      const dateObj = new Date(dateStr + 'T12:00:00');
      const isSunday = dateObj.getDay() === 0;
      html += `<th class="${isSunday ? 'sunday' : ''}">${dayNum}<br/><span style="font-size: 8px; font-weight: normal;">${WEEKDAYS[dateObj.getDay()]}</span></th>`;
    });

    html += `
              </tr>
            </thead>
            <tbody>
    `;

    shifts.forEach(shift => {
      const empsInShift = groupedEmployees[shift.id] || [];
      if (empsInShift.length === 0) return;

      html += `
        <tr>
          <td colspan="${daysArray.length + 1}" class="shift-header" style="background-color: ${shift.bg || '#F0F3F4'}; color: ${shift.color || '#2C3E50'}">
            ${shift.name} (${shift.time})
          </td>
        </tr>
      `;

      empsInShift.forEach(emp => {
        html += `<tr><td class="personnel">${emp.full_name}</td>`;
        daysArray.forEach(dateStr => {
          const isOff = schedules[emp.id]?.[dateStr] === 'day_off';
          if (isOff) {
            html += `<td style="background-color: #FFFFFF"><span class="off-day">D</span></td>`;
          } else {
            html += `<td style="background-color: ${shift.bg || '#F4F6F7'}"></td>`;
          }
        });
        html += `</tr>`;
      });
    });

    if (groupedEmployees['unassigned']?.length > 0) {
      html += `
        <tr>
          <center><td colspan="${daysArray.length + 1}" class="shift-header">
            Unassigned Shift
          </td>
        </tr>
      `;
      groupedEmployees['unassigned'].forEach(emp => {
        html += `<tr><td class="personnel">${emp.full_name}</td>`;
        daysArray.forEach(dateStr => {
          const isOff = schedules[emp.id]?.[dateStr] === 'day_off';
          if (isOff) {
            html += `<td style="background-color: #FFFFFF"><span class="off-day">D</span></td>`;
          } else {
            html += `<td style="background-color: #F8F9FA"></td>`;
          }
        });
        html += `</tr>`;
      });
    }

    html += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    return html;
  };

  const exportToPDF = async () => {
    try {
      const htmlContent = generateHTML();
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 842, // A4 landscape width in points
        height: 595, // A4 landscape height in points
      });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Export Schedule PDF'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate or share PDF: ' + error.message);
    }
  };

  // Group employees by active shift
  const groupedEmployees = {};
  shifts.forEach(s => {
    groupedEmployees[s.id] = [];
  });
  // Also create a dynamic group for unassigned or custom shifts not stored in setting
  groupedEmployees['unassigned'] = [];

  employees.forEach(emp => {
    const shiftId = employeeShifts[emp.id];
    if (shiftId && groupedEmployees[shiftId]) {
      groupedEmployees[shiftId].push(emp);
    } else {
      groupedEmployees['unassigned'].push(emp);
    }
  });

  return (
    <View style={styles.container}>
      {/* Month navigation & Seeding controls */}
      <View style={styles.topBar}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={exportToPDF} style={styles.exportBtn} activeOpacity={0.8}>
          <Ionicons name="print" size={16} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.exportText}>Export PDF</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#E74C3C" style={{ flex: 1 }} />
      ) : (
        <ScrollView style={styles.gridContainer} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* We wrap headers and rows in a horizontal ScrollView */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.table}>
              {/* Header row */}
              <View style={styles.tableHeaderRow}>
                <View style={styles.personnelColHeader}>
                  <Text style={styles.personnelColText}>PERSONNEL</Text>
                </View>
                {daysArray.map((dateStr, idx) => {
                  const dayNum = idx + 1;
                  const dateObj = new Date(dateStr + 'T12:00:00');
                  const weekdayStr = WEEKDAYS[dateObj.getDay()];
                  const isSunday = dateObj.getDay() === 0;

                  return (
                    <View key={dateStr} style={[styles.dayColHeader, isSunday && styles.sundayColHeader]}>
                      <Text style={[styles.dayColNum, isSunday && styles.sundayText]}>{dayNum}</Text>
                      <Text style={[styles.dayColName, isSunday && styles.sundayText]}>{weekdayStr}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Loop shifts and draw grouped employees */}
              {shifts.map(shift => {
                const empsInShift = groupedEmployees[shift.id] || [];
                if (empsInShift.length === 0) return null;

                return (
                  <View key={shift.id}>
                    {/* Shift Group Header Bar */}
                    <View style={[styles.shiftGroupHeader, { backgroundColor: shift.bg || '#F0F3F4' }]}>
                      <Text style={[styles.shiftGroupText, { color: shift.color || '#2C3E50' }]}>
                        {shift.name} ({shift.time})
                      </Text>
                    </View>

                    {/* Employee Rows */}
                    {empsInShift.map(emp => (
                      <View key={emp.id} style={styles.empRow}>
                        <View style={styles.nameCell}>
                          <Text style={styles.nameText} numberOfLines={1}>
                            {emp.full_name}
                          </Text>
                        </View>

                        {daysArray.map(dateStr => {
                          const isOff = schedules[emp.id]?.[dateStr] === 'day_off';
                          const dateObj = new Date(dateStr + 'T12:00:00');
                          const isSunday = dateObj.getDay() === 0;

                          return (
                            <View
                              key={dateStr}
                              style={[
                                styles.gridCell,
                                {
                                  backgroundColor: isOff ? '#FFFFFF' : (shift.bg || '#F4F6F7'),
                                  borderColor: shift.color || '#BDC3C7',
                                }
                              ]}
                            >
                              {isOff ? (
                                <View style={styles.offBox}>
                                  <Text style={styles.offText}>D</Text>
                                </View>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                );
              })}

              {/* Unassigned Employees Group */}
              {groupedEmployees['unassigned']?.length > 0 && (
                <View>
                  <View style={[styles.shiftGroupHeader, { backgroundColor: '#EAEDED' }]}>
                    <Text style={[styles.shiftGroupText, { color: '#7F8C8D' }]}>
                      Unassigned Shift
                    </Text>
                  </View>

                  {groupedEmployees['unassigned'].map(emp => (
                    <View key={emp.id} style={styles.empRow}>
                      <View style={styles.nameCell}>
                        <Text style={styles.nameText} numberOfLines={1}>
                          {emp.full_name}
                        </Text>
                      </View>

                      {daysArray.map(dateStr => {
                        const isOff = schedules[emp.id]?.[dateStr] === 'day_off';
                        return (
                          <View
                            key={dateStr}
                            style={[
                              styles.gridCell,
                              {
                                backgroundColor: isOff ? '#FFFFFF' : '#F8F9FA',
                                borderColor: '#BDC3C7',
                              }
                            ]}
                          >
                            {isOff ? (
                              <View style={styles.offBox}>
                                <Text style={styles.offText}>D</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
    backgroundColor: '#F8F9FA'
  },
  monthNav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { backgroundColor: '#E74C3C', padding: 6, borderRadius: 6 },
  monthText: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', marginHorizontal: 12, minWidth: 100, textAlign: 'center' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498DB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  gridContainer: { flex: 1 },
  table: { flexDirection: 'column' },

  // Table Headers
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderBottomWidth: 1.5, borderBottomColor: '#BDC3C7' },
  personnelColHeader: {
    width: 170,
    justifyContent: 'center',
    paddingLeft: 12,
    borderRightWidth: 1.5,
    borderRightColor: '#BDC3C7',
    height: 50,
  },
  personnelColText: { fontSize: 13, fontWeight: 'bold', color: '#2C3E50', letterSpacing: 0.5 },
  dayColHeader: {
    width: 44,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#BDC3C7',
  },
  sundayColHeader: { backgroundColor: '#FFEBEE' },
  dayColNum: { fontSize: 13, fontWeight: 'bold', color: '#2C3E50' },
  dayColName: { fontSize: 10, color: '#7F8C8D', marginTop: 2 },
  sundayText: { color: '#C62828', fontWeight: 'bold' },

  // Shift Headers
  shiftGroupHeader: {
    paddingVertical: 8,
    paddingLeft: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BDC3C7',
  },
  shiftGroupText: { fontSize: 13, fontWeight: 'bold' },

  // Employee Rows
  empRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ECF0F1' },
  nameCell: {
    width: 170,
    justifyContent: 'center',
    paddingLeft: 12,
    borderRightWidth: 1.5,
    borderRightColor: '#BDC3C7',
    height: 38,
    backgroundColor: '#FDFEFE',
  },
  nameText: { fontSize: 12, fontWeight: 'bold', color: '#2C3E50' },

  // Grid Cells
  gridCell: {
    width: 44,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ECF0F1',
    borderBottomWidth: 1,
  },
  offBox: {
    width: 32,
    height: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  offText: { fontSize: 13, fontWeight: 'bold', color: '#C62828' },
});
