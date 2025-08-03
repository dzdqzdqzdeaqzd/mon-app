import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, Alert, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl, SafeAreaView, StatusBar, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../supabase';
import { Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import { Buffer } from 'buffer';
import ImageViewing from 'react-native-image-viewing';

export default function Annonces() {
  const [annonces, setAnnonces] = useState([]);
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [imageUris, setImageUris] = useState([]);
  const [isChef, setIsChef] = useState(false);
  const [userId, setUserId] = useState(null);
  const [liked, setLiked] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    init();

    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert('Permission requise', 'L\'application a besoin d\'accéder à la caméra.');
      }

      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaStatus !== 'granted') {
        Alert.alert('Permission requise', 'L\'application a besoin d\'accéder à la galerie.');
      }
    })();
  }, []);

  const init = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    setUserId(user.user.id);

    const { data } = await supabase
      .from('clients')
      .select('role')
      .eq('id', user.user.id)
      .single();

    if (data?.role === 'chef') setIsChef(true);

    fetchAnnonces();
    fetchLikes();
  };

  const fetchAnnonces = async () => {
    const { data } = await supabase
      .from('annonces')
      .select(`id, titre, contenu, image_urls, created_at, user_id,
               clients (prenom, nom), annonce_likes (user_id)`)
      .order('created_at', { ascending: false });

    if (data) {
      setAnnonces(data.map(a => ({
        ...a,
        like_count: a.annonce_likes?.length || 0
      })));
    }
  };

  const fetchLikes = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('annonce_likes')
      .select('annonce_id')
      .eq('user_id', userId);

    if (data) setLiked(new Set(data.map(l => l.annonce_id)));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAnnonces(), fetchLikes()]);
    setRefreshing(false);
  };
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const newUris = result.assets.map(asset => asset.uri);
      const combined = [...imageUris, ...newUris].slice(0, 4);
      setImageUris(combined);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const combined = [...imageUris, result.assets[0].uri].slice(0, 4);
      setImageUris(combined);
    }
  };

  const removeImage = (uriToRemove) => {
    setImageUris(imageUris.filter(uri => uri !== uriToRemove));
  };

  const uploadImage = async (uri) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const filename = `${userId}/${Date.now()}-${Math.random()}.jpg`;
    const arrayBuffer = Buffer.from(base64, 'base64');

    const { error } = await supabase.storage
      .from('images')
      .upload(filename, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filename);

    return urlData.publicUrl;
  };

  const handlePublier = async () => {
    if (!titre.trim() || !contenu.trim()) {
      Alert.alert('Erreur', 'Titre et contenu requis.');
      return;
    }

    setUploading(true);
    try {
      let uploadedUrls = [];
      for (const uri of imageUris) {
        const url = await uploadImage(uri);
        uploadedUrls.push(url);
      }

      const { error } = await supabase.from('annonces').insert([{
        titre,
        contenu,
        image_urls: uploadedUrls,
        user_id: userId,
      }]);

      if (error) throw error;

      setTitre('');
      setContenu('');
      setImageUris([]);
      fetchAnnonces();
    } catch (err) {
      console.error('Erreur publication :', err);
      Alert.alert('Erreur', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (annonceId) => {
    if (!userId) return;

    const isLiked = liked.has(annonceId);

    if (isLiked) {
      await supabase
        .from('annonce_likes')
        .delete()
        .match({ annonce_id: annonceId, user_id: userId });
    } else {
      await supabase
        .from('annonce_likes')
        .insert({ annonce_id: annonceId, user_id: userId });
    }

    await fetchLikes();
  };

  const renderItem = ({ item }) => {
    let urls = item.image_urls;

    if (typeof urls === 'string') {
      try {
        urls = JSON.parse(urls);
      } catch (e) {
        urls = [];
      }
    }

    const renderGridImages = () => {
      const count = urls.length;
      const containerStyle = [styles.gridContainer, count === 1 && { flexDirection: 'column' }];

      return (
        <View style={containerStyle}>
          {urls.slice(0, 4).map((url, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setViewerImages(urls.map(u => ({ uri: u })));
                setViewerIndex(i);
                setIsViewerVisible(true);
              }}
              style={styles.gridImageWrapper}
            >
              <Image source={{ uri: url }} style={styles.gridImage} />
            </TouchableOpacity>
          ))}
        </View>
      );
    };

    return (
      <View style={styles.card}>
        <Text style={styles.titre}>{item.titre}</Text>
        <Text style={styles.contenu}>{item.contenu}</Text>
        {Array.isArray(urls) && urls.length > 0 && renderGridImages()}

        <TouchableOpacity
          onPress={() => handleLike(item.id)}
          style={styles.likeBtn}
        >
          <AntDesign
            name={liked.has(item.id) ? 'heart' : 'hearto'}
            size={20}
            color="#FF3B30"
          />
          <Text style={styles.likeText}>{item.like_count}</Text>
        </TouchableOpacity>
      </View>
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isChef && (
          <View style={styles.form}>
            <TextInput
              placeholder="Titre"
              value={titre}
              onChangeText={setTitre}
              style={styles.input}
            />
            <TextInput
              placeholder="Contenu"
              value={contenu}
              onChangeText={setContenu}
              style={[styles.input, { height: 80 }]}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={pickImages} style={styles.imageBtn}>
                <Ionicons name="images-outline" size={20} color="#888" />
                <Text style={styles.imageBtnText}>Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takePhoto} style={styles.imageBtn}>
                <Ionicons name="camera-outline" size={20} color="#888" />
                <Text style={styles.imageBtnText}>Photo</Text>
              </TouchableOpacity>
            </View>

            {imageUris.length > 0 && (
              <ScrollView horizontal style={styles.previewContainer}>
                {imageUris.map((uri, index) => (
                  <View key={index} style={styles.previewBox}>
                    <Image
                      source={{ uri }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeIcon}
                      onPress={() => removeImage(uri)}
                    >
                      <Feather name="x-circle" size={22} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={handlePublier}
              style={styles.submitButton}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Publier</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={annonces}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ padding: 10 }}
        />

        <ImageViewing
          images={viewerImages}
          imageIndex={viewerIndex}
          visible={isViewerVisible}
          onRequestClose={() => setIsViewerVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 15 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
  },
  imageBtnText: { marginLeft: 8, color: '#555' },
  previewContainer: { flexDirection: 'row', marginBottom: 10 },
  previewBox: { position: 'relative', marginRight: 10 },
  previewImage: { width: 100, height: 100, borderRadius: 8 },
  removeIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  submitButton: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  titre: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  contenu: { fontSize: 14, marginBottom: 10 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  likeText: { marginLeft: 6, color: '#333' },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 5,
    marginTop: 8,
  },
  gridImageWrapper: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 5,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});
