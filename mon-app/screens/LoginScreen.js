import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, SafeAreaView, StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadSavedCredentials = async () => {
      const savedEmail = await AsyncStorage.getItem("savedEmail");
      const savedPassword = await AsyncStorage.getItem("savedPassword");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
      if (savedPassword) setPassword(savedPassword);
    };
    loadSavedCredentials();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Merci de remplir tous les champs.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error("Erreur login:", error);
      Alert.alert("Erreur", error.message);
      return;
    }

    if (rememberMe) {
      await AsyncStorage.setItem("savedEmail", email);
      await AsyncStorage.setItem("savedPassword", password);
    } else {
      await AsyncStorage.removeItem("savedEmail");
      await AsyncStorage.removeItem("savedPassword");
    }

    console.log("✅ Login réussi:", data.session);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Bienvenue</Text>
        <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Adresse email"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#888"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        {/* ✅ Case "Se souvenir de moi" */}
        <View style={styles.rememberMeContainer}>
          <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} style={styles.checkbox}>
            <Ionicons
              name={rememberMe ? "checkbox-outline" : "square-outline"}
              size={22}
              color="#FFA500"
            />
            <Text style={styles.rememberMeText}>Se souvenir de moi</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.secondaryBtnText}>Créer un nouveau compte</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkContainer}>
          <Text style={styles.link}>Mot de passe oublié ?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  header: {
    padding: 30,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  icon: {
    marginRight: 5,
  },
  input: {
    flex: 1,
    color: "#333",
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberMeText: {
    marginLeft: 8,
    color: "#333",
  },
  primaryBtn: {
    backgroundColor: "#FFA500",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryBtn: {
    borderColor: "#FFA500",
    borderWidth: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryBtnText: {
    color: "#FFA500",
    fontWeight: "600",
    fontSize: 16,
  },
  linkContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  link: {
    color: "#888",
    fontSize: 14,
  },
});
