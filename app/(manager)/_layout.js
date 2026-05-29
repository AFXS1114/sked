import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function ManagerLayout() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: signOut, style: 'destructive' }
      ]
    );
  };

  useEffect(() => {
    async function sendDailySummary() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const today = new Date().toISOString().split('T')[0];

      const { data: schedules } = await supabase
        .from('schedules')
        .select('shift_type')
        .eq('work_date', today);

      const dutyCount = schedules?.filter(s => s.shift_type === 'duty').length || 0;
      const offCount = schedules?.filter(s => s.shift_type === 'day_off').length || 0;

      const { data: leaves } = await supabase
        .from('leaves')
        .select('id')
        .lte('start_date', today)
        .gte('end_date', today)
        .eq('status', 'approved');

      const leaveCount = leaves?.length || 0;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Today's Summary",
          body: `Duty: ${dutyCount} | Day Off: ${offCount} | Leave: ${leaveCount}`,
        },
        trigger: null,
      });
    }
    
    sendDailySummary();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#3498DB' },
        headerTintColor: '#FFF',
        tabBarActiveTintColor: '#3498DB',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.replace('/')} style={{ marginLeft: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="duty-board"
        options={{
          title: 'Duty Board',
          tabBarIcon: ({ color }) => <Ionicons name="clipboard" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leave-viewer"
        options={{
          title: 'Leave Viewer',
          tabBarIcon: ({ color }) => <Ionicons name="umbrella" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ color }) => <Ionicons name="call" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
