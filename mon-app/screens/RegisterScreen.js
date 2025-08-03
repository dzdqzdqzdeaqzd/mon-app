import React, { useState } from 'react';
import {
  View, TextInput, Text, Alert,
  StyleSheet, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, SafeAreaView, ScrollView
} from 'react-native';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (!email || !password || !prenom || !nom) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) throw signUpError;

      const user = signUpData.user;
      if (!user) throw new Error('Utilisateur non retourné');

      await supabase.from('clients').insert({
        id: user.id,
        email,
        prenom,
        nom,
        role: email === 'elahmarelie@yahoo.fr' ? 'chef' : 'client',
        tokens: 0
      });

      Alert.alert(
        'Inscription réussie',
        'Votre compte a été créé avec succès !',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );

    } catch (error) {
      Alert.alert('Erreur', error.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez notre communauté</Text>
          </View>

          <View style={styles.form}>
            <InputField
              icon="person-outline"
              placeholder="Prénom"
              value={prenom}
              onChangeText={setPrenom}
            />
            <InputField
              icon="people-outline"
              placeholder="Nom"
              value={nom}
              onChangeText={setNom}
            />
            <InputField
              icon="mail-outline"
              placeholder="Adresse email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <InputField
              icon="lock-closed-outline"
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureEntry}
              toggleSecureEntry={() => setSecureEntry(!secureEntry)}
              showSecureToggle
              isSecure={secureEntry}
            />

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Déjà un compte ?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const InputField = ({
  icon, placeholder, value, onChangeText,
  secureTextEntry, toggleSecureEntry, showSecureToggle, isSecure, keyboardType
}) => (
  <View style={styles.inputContainer}>
    <Ionicons name={icon} size={20} color="#888" style={{ marginRight: 10 }} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#888"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType || "default"}
      autoCapitalize="none"
    />
    {showSecureToggle && (
      <TouchableOpacity onPress={toggleSecureEntry}>
        <Ionicons
          name={isSecure ? "eye-off-outline" : "eye-outline"}
          size={20}
          color="#888"
        />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',  // 👈 fond clair
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: '#FFA500',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 15,
    color: '#fff',
    marginTop: 5,
  },
  form: {
    padding: 20,
    marginTop: -20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    color: '#333',
    paddingVertical: 14,
  },
  button: {
    backgroundColor: '#FFA500',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#888',
  },
  loginLink: {
    color: '#FFA500',
    marginLeft: 5,
    fontWeight: '600',
  },
});
