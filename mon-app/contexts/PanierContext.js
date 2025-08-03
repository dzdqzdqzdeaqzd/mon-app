import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PanierContext = createContext();

export const PanierProvider = ({ children }) => {
  const [panier, setPanier] = useState([]);
  const [userTokens, setUserTokens] = useState(0);
  const [userId, setUserId] = useState(null);

  const ajouterAuPanier = (item) => {
    setPanier((prev) => {
      const updated = [...prev, item];
      AsyncStorage.setItem('panier', JSON.stringify(updated));
      return updated;
    });
  };

  const retirerDuPanier = (index) => {
    const updated = [...panier];
    updated.splice(index, 1);
    setPanier(updated);
    AsyncStorage.setItem('panier', JSON.stringify(updated));
  };

  const viderPanier = () => {
    setPanier([]);
    AsyncStorage.removeItem('panier');
  };
  // Charger le panier depuis le stockage local au démarrage
  useEffect(() => {
    const restorePanier = async () => {
      try {
        const saved = await AsyncStorage.getItem('panier');
        if (saved) setPanier(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    };
    restorePanier();
  }, []);

  // récupère userId dès la connexion
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setUserTokens(0); // reset
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // charge les tokens quand on a userId
  useEffect(() => {
    if (!userId) return;

    const fetchTokens = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('tokens')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUserTokens(data.tokens);
      }
    };

    fetchTokens();
  }, [userId]);

  return (
    <PanierContext.Provider
      value={{
        panier,
        ajouterAuPanier,
        retirerDuPanier,
        viderPanier,
        userTokens,
        setUserTokens,
      }}
    >
      {children}
    </PanierContext.Provider>
  );
};
