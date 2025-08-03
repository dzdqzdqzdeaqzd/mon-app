import React, { useEffect, useState } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// (suppression de l'import en double)
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

export default function EtatDesLieux() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [plats, setPlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPlats();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const fetchPlats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plats')
        .select('*')
        .order('prix', { ascending: true });
      if (error) throw error;
      // Par défaut, tout dispo si champ null/undefined
      setPlats(
        (data || []).map(plat => ({
          ...plat,
          disponible: plat.disponible === undefined || plat.disponible === null ? true : plat.disponible
        }))
      );
    } catch (err) {
      alert('Erreur chargement plats: ' + (err.message || err));
      setPlats([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDispo = async (platId, value) => {
    setPlats(plats => plats.map(p => p.id === platId ? { ...p, disponible: value } : p));
    setUpdating(true);
    try {
      await supabase
        .from('plats')
        .update({ disponible: value })
        .eq('id', platId);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text>Chargement…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Suppression du header titre pour éviter la redondance */}
      <FlatList
        data={plats}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item, index }) => (
          <View style={[styles.row, { marginBottom: index === plats.length - 1 ? 0 : 14 }]}> 
            <View style={styles.leftRow}>
              <LinearGradient
                colors={item.disponible ? ["#FF9500", "#FFD580"] : ["#bbb", "#eee"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumCircle}
              >
                <MaterialIcons
                  name={item.disponible ? "check-circle" : "cancel"}
                  size={26}
                  color={item.disponible ? "#fff" : "#fff"}
                  style={{
                    textShadowColor: item.disponible ? '#FF9500' : '#bbb',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 6,
                  }}
                />
              </LinearGradient>
              <Text style={[styles.nom, !item.disponible && { color: '#bbb', textDecorationLine: 'line-through' }]}>{item.nom}</Text>
            </View>
            <Switch
              value={item.disponible}
              onValueChange={v => toggleDispo(item.id, v)}
              trackColor={{ false: '#e0e0e0', true: '#FF9500' }}
              thumbColor={item.disponible ? '#fff' : '#fff'}
              disabled={updating}
            />
          </View>
        )}
        ListFooterComponent={<View style={{ height: 120 + insets.bottom }} />}
        contentContainerStyle={{ padding: 18, paddingTop: 10, paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
        style={{ marginBottom: 18 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 0, marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FF9500', letterSpacing: 0.5 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#eee', borderRadius: 8 },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 15 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f9f9f9', padding: 18, borderRadius: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
  },
  leftRow: { flexDirection: 'row', alignItems: 'center' },
  premiumCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#FF9500',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  nom: { fontSize: 17, color: '#333', fontWeight: '500' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
