import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import FlatCard from '../../components/FlatCard';
import { Ionicons } from '@expo/vector-icons';

export default function DirectoryScreen() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    setLoading(true);
    const { data, error } = await supabase.from('employees').select('*').order('full_name');
    if (!error && data) {
      setEmployees(data);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="large" color="#3498DB" /> : (
        <FlatList
          data={employees}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <FlatCard style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.position}>{item.position}</Text>
              </View>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone_number}`)} style={styles.callBtn}>
                <Ionicons name="call" size={24} color="#FFF" />
              </TouchableOpacity>
            </FlatCard>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  position: { fontSize: 14, color: '#7F8C8D', marginBottom: 4 },
  callBtn: { backgroundColor: '#2ECC71', padding: 12, borderRadius: 24 }
});
