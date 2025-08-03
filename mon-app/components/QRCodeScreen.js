import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions } from 'react-native';
import { Camera } from 'expo-camera';

export default function QRCodeScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    Alert.alert('QR Code Scanné', `Type: ${type}\nData: ${data}`);
  };

  if (hasPermission === null) {
    return <Text>Demande de permission pour la caméra...</Text>;
  }
  if (hasPermission === false) {
    return <Text>Permission refusée pour la caméra.</Text>;
  }

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Demande de permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>Pas d'accès à la caméra</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      {scanned && (
        <Text style={styles.scanAgain} onPress={() => setScanned(false)}>
          Appuyez pour scanner à nouveau
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAgain: {
    fontSize: 16,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    borderRadius: 8,
    position: 'absolute',
    bottom: 50,
    textAlign: 'center',
  },
});
