import React, { useEffect, useState, useContext } from 'react';
import { TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { supabase } from './supabase';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import Menu from './components/Menu';
import Panier from './components/Panier';
import Annonces from './components/Annonces';
import Chat from './components/Chat';
import EtatDesLieux from './components/EtatDesLieux';
import QRCodeScreen from './components/QRCodeScreen';
import { PanierProvider, PanierContext } from './contexts/PanierContext';
// @ts-ignore
import ScanScreen from './screens/Scan';


// 🪄 Polyfill structuredClone (pour compatibilité si besoin)
if (typeof global.structuredClone !== 'function') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { panier } = useContext(PanierContext);
  const [isChef, setIsChef] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('clients')
        .select('role')
        .eq('id', user.id)
        .single();
      setIsChef(data?.role === 'chef');
    };
    fetchRole();

    const fetchUnreadMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('read', false);
      setUnreadMessages(data?.length || 0);
    };
    fetchUnreadMessages();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
        }
      }
    ]);
  };

  return (
    <Tab.Navigator
      initialRouteName="Menu"
      screenOptions={({ route }) => ({
        headerRight: () => (
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            style={{
              marginRight: 12,
              borderRadius: 18,
              shadowColor: '#FF9500',
              shadowOpacity: 0.13,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 1 },
              elevation: 3,
              ...Platform.select({ android: { elevation: 5 } }),
            }}
          >
            <LinearGradient
              colors={["#FF9500", "#FF3B30"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 18,
              }}
            >
              <MaterialIcons name="logout" size={16} color="#fff" style={{ marginRight: 5 }} />
              <Text
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 13,
                  letterSpacing: 0.2,
                  textShadowColor: '#FF9500',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                Déconnexion
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: '#FF9500',
        tabBarInactiveTintColor: '#bbb',
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#f8f8f8',
          height: 56 + (insets.bottom || 0),
          paddingBottom: insets.bottom || 0,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontWeight: '500',
          fontSize: 12,
          letterSpacing: 0.2,
          marginBottom: 1,
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Menu') return <MaterialCommunityIcons name="food" size={size + 6} color={color} />;
          if (route.name === 'Panier') return <MaterialIcons name="shopping-cart" size={size + 4} color={color} />;
          if (route.name === 'Annonces') return <MaterialIcons name="campaign" size={size + 4} color={color} />;
          if (route.name === 'Chat') return <Ionicons name="chatbubble-ellipses" size={size + 4} color={color} />;
          if (route.name === 'Scan QR Code') return <MaterialIcons name="qr-code-scanner" size={size + 4} color={color} />;
          if (route.name === 'État des lieux') return <MaterialIcons name="restaurant-menu" size={size + 4} color={color} />;
        },
        tabBarBadge:
          (route.name === 'Chat' && unreadMessages > 0) || (route.name === 'Annonces' && unreadMessages > 0)
            ? unreadMessages
            : undefined,
        tabBarButton: (props) => <TouchableOpacity activeOpacity={1} {...props} />,
      })}
    >
      <Tab.Screen name="Menu" component={Menu} />
      <Tab.Screen
        name="Panier"
        component={Panier}
        options={{ tabBarBadge: panier.length > 0 ? panier.length : undefined }}
      />
      <Tab.Screen name="Annonces" component={Annonces} />
      <Tab.Screen name="Chat" component={Chat} />
      {!isChef && <Tab.Screen name="Scan QR Code" component={QRCodeScreen} />}
      {isChef && <Tab.Screen name="État des lieux" component={EtatDesLieux} />}
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <PanierProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {session ? (
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PanierProvider>
  );
}
