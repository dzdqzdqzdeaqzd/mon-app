import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { supabase } from '../supabase';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);

    try {
      const parsed = JSON.parse(data);
      const { achat_id, points, balance_id, date } = parsed;

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Erreur", "Utilisateur non connecté.");
        return;
      }

      const { error } = await supabase.from('fidelites').insert({
        client_id: user.id,
        achat_id,
        points,
        date_scan: new Date().toISOString(),
        balance_id
      });

      if (error) {
        console.error("Erreur Supabase :", error);
        Alert.alert("Erreur", "Échec lors de l'enregistrement des points.");
      } else {
        Alert.alert("🎉 Succès", `+${points} points de fidélité ajoutés !`);
      }

    } catch (e) {
      console.error("Erreur de parsing QR :", e);
      Alert.alert("Erreur", "QR code invalide ou malformé.");
    }

    setTimeout(() => setScanned(false), 4000);
  };

  if (hasPermission === null) return <Text>Demande de permission...</Text>;
  if (hasPermission === false) return <Text>Accès à la caméra refusé</Text>;

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      {scanned && (
        <Text style={styles.info}>
          QR scanné, enregistrement en cours...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  info: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    fontSize: 16,
    color: 'white',
    backgroundColor: '#00000099',
    padding: 10,
    borderRadius: 10
  }
});
