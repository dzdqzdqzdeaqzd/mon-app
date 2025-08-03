import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Image, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';
import { PanierContext } from '../contexts/PanierContext';
import { MaterialIcons } from '@expo/vector-icons';

const Card = ({ item, onAdd }) => {
  const isIndispo = !item.disponible;
  return (
    <View
      style={[
        styles.card,
        isIndispo && {
          backgroundColor: '#f2f2f2',
          borderColor: '#ddd',
          opacity: 1,
        },
      ]}
    >
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={[styles.image, isIndispo && { opacity: 0.3 }]}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <MaterialIcons name="image" size={40} color="#ccc" />
        </View>
      )}
      <View style={styles.info}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Text
            style={[
              styles.nom,
              isIndispo && {
                color: '#bbb',
                textDecorationLine: 'line-through',
                fontStyle: 'italic',
              },
            ]}
          >
            {item.nom}
          </Text>
          {isIndispo && (
            <MaterialIcons name="block" size={18} color="#e74c3c" style={{ marginLeft: 6 }} />
          )}
        </View>
        <Text style={[styles.desc, isIndispo && { color: '#bbb' }]}>{item.description}</Text>
        <Text style={[styles.prix, isIndispo && { color: '#bbb' }]}>{item.prix} €</Text>
        {isIndispo && (
          <Text style={{ color: '#e74c3c', fontSize: 13, marginTop: 2, fontWeight: 'bold' }}>Indisponible aujourd'hui</Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.addButton,
          isIndispo && {
            backgroundColor: '#e0e0e0',
            borderColor: '#bbb',
            borderWidth: 1,
          },
        ]}
        onPress={() => item.disponible && onAdd(item)}
        disabled={isIndispo}
      >
        <MaterialIcons name="add-shopping-cart" size={20} color={item.disponible ? '#fff' : '#888'} />
      </TouchableOpacity>
    </View>
  );
};

export default function Menu() {
  const [plats, setPlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { ajouterAuPanier, userTokens } = useContext(PanierContext);
  const isFocused = useIsFocused();
  const channelRef = useRef(null);

  // Group by category with fallback
  const sections = useMemo(() => {
    const grouped = plats.reduce((acc, plat) => {
      const category = plat.category || 'Non classé';
      if (!acc[category]) acc[category] = [];
      acc[category].push(plat);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([catA], [catB]) => catA.localeCompare(catB))
      .map(([title, data]) => ({ title, data }));
  }, [plats]);

  useEffect(() => {
    // fetchMenu: showLoader = true pour le premier chargement, false pour update live
    const fetchMenu = async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        const { data, error } = await supabase
          .from('plats')
          .select('*')
          .order('prix', { ascending: true });
        if (error) throw error;
        const platsData = (data || []).map(plat => ({
          ...plat,
          disponible: plat.disponible === undefined || plat.disponible === null ? true : plat.disponible
        }));
        console.log('PLATS RECUS:', platsData);
        setPlats(platsData);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        if (showLoader) setLoading(false);
      }
    };

    fetchMenu(true); // premier chargement avec loader

    // Souscription live façon Chat.js
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel('plats-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'plats' }, (payload) => {
        console.log('SUPABASE EVENT recu:', payload);
        fetchMenu(false); // update live sans loader
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [isFocused]);

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.sectionDivider} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.welcome}>Bon appétit !</Text>
        <View style={styles.tokenBadge}>
          <Text style={styles.tokenText}>{userTokens} pts</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFA500" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <Card item={item} onAdd={ajouterAuPanier} />}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFA500',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  tokenBadge: {
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tokenText: {
    color: '#FFA500',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 15,
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  info: {
    flex: 1,
  },
  nom: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  desc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  prix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFA500',
  },
  addButton: {
    backgroundColor: '#FFA500',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 1,
  },
  sectionDivider: {
    height: 2,
    backgroundColor: '#FFA500',
    width: '30%',
    marginTop: 5,
  },
  itemSeparator: {
    height: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});