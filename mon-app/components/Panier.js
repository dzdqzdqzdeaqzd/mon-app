import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { PanierContext } from '../contexts/PanierContext';
import { supabase } from '../supabase';
import { MaterialIcons } from '@expo/vector-icons';

export default function Panier() {
  const {
    panier,
    retirerDuPanier,
    viderPanier,
    userTokens,
    setUserTokens,
  } = useContext(PanierContext);

  const [loadingTokens, setLoadingTokens] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [useFidelite, setUseFidelite] = useState(false);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(userError.message);
        if (!user?.user) return;

        const { data, error } = await supabase
          .from('clients')
          .select('tokens')
          .eq('id', user.user.id)
          .single();

        if (error) throw new Error(error.message);
        if (!data) throw new Error("Impossible de récupérer les tokens");

        setUserTokens(data.tokens || 0);
      } catch (error) {
        console.error("Erreur fetchTokens:", error);
        Alert.alert("Erreur", error.message);
      } finally {
        setLoadingTokens(false);
      }
    };

    fetchTokens();
  }, []);

  const total = panier.reduce((sum, item) => sum + item.prix, 0);
  const fraisService = panier.length > 0 ? 1.5 : 0;
  const pointsGagnes = Math.floor(total / 10);
  const pointsDisponibles = userTokens;
  const reductionFidelite = useFidelite ? Math.floor(pointsDisponibles / 20) * 4 : 0;
  const totalFinal = total + fraisService - reductionFidelite;

  const payer = async () => {
    if (total === 0) {
      Alert.alert("Panier vide", "Ajoutez des articles avant de payer");
      return;
    }

    setProcessingPayment(true);

    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.user) {
        throw new Error(userError?.message || "Utilisateur non authentifié");
      }

      const userId = user.user.id;

      // On incrémente les points via la fonction SQL
      const { error } = await supabase.rpc('add_tokens', {
        user_id: userId,
        amount: pointsGagnes,
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de la mise à jour des points");
      }

      setUserTokens(prev => prev + pointsGagnes);

      viderPanier();

      Alert.alert(
        "Paiement réussi",
        `Merci pour votre commande de ${total.toFixed(2)}€ !\nVous avez gagné ${pointsGagnes} points.`
      );

    } catch (err) {
      console.error("Erreur paiement:", err);
      Alert.alert("Erreur", err.message || "Une erreur est survenue pendant le paiement.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.nom}</Text>
        <Text style={styles.itemPrice}>{item.prix.toFixed(2)} €</Text>
      </View>
      <TouchableOpacity
        onPress={() => retirerDuPanier(index)}
        style={styles.removeButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="delete-outline" size={22} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Mon Panier</Text>
        {loadingTokens ? (
          <ActivityIndicator size="small" color="#FF9500" />
        ) : (
          <View style={styles.tokenBadge}>
            <MaterialIcons name="loyalty" size={18} color="#FF9500" />
            <Text style={styles.tokenText}>{userTokens} pts</Text>
          </View>
        )}
      </View>

      {panier.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="remove-shopping-cart" size={50} color="#C7C7CC" />
          <Text style={styles.emptyText}>Votre panier est vide</Text>
          <Text style={styles.emptySubtext}>Parcourez notre menu pour découvrir nos délices</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={panier}
            renderItem={renderItem}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={<View style={styles.listHeader} />}
          />

          <View style={styles.footer}>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontSize: 11, color: '#aaa' }]}>Sous-total</Text>
                <Text style={{ fontSize: 11, color: '#aaa', fontWeight: '400' }}>{total.toFixed(2)} €</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontSize: 10, color: '#bbb' }]}>Frais de service click & collect</Text>
                <Text style={{ fontSize: 10, color: '#bbb', fontWeight: '400' }}>{fraisService.toFixed(2)} €</Text>
              </View>
              {pointsDisponibles > 0 && (
                <View style={{ marginTop: 2, marginBottom: 6 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32, paddingVertical: 2, zIndex: 10 }}
                    onPress={() => setUseFidelite(v => !v)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={useFidelite ? 'check-box' : 'check-box-outline-blank'}
                      size={24}
                      color={useFidelite ? '#4CAF50' : '#bbb'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ fontSize: 15, color: '#4CAF50', fontWeight: 'bold' }}>
                      Utiliser mes points fidélité ({pointsDisponibles} pts, -{reductionFidelite} €)
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, color: '#4CAF50', marginLeft: 32, fontWeight: '600' }}>
                    20 pts = -4 € (points valides uniquement, expiration 1 mois)
                  </Text>
                </View>
              )}
              {useFidelite && reductionFidelite > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#4CAF50', fontSize: 14, fontWeight: 'bold' }]}>Réduction fidélité</Text>
                  <Text style={[styles.summaryLabel, { color: '#4CAF50', fontSize: 14, fontWeight: 'bold' }]}>- {reductionFidelite} €</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontWeight: 'bold', fontSize: 16, color: '#1C1C1E' }]}>Total à payer</Text>
                <Text style={[styles.totalAmount, { color: '#1C1C1E', fontSize: 18 }]}>{totalFinal.toFixed(2)} €</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Points à gagner</Text>
                <Text style={[styles.pointsText, { color: '#43A047', fontWeight: 'bold', fontSize: 15 }]}>+ {pointsGagnes} pts</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.payButton, processingPayment && styles.payButtonDisabled]}
              onPress={payer}
              activeOpacity={0.9}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.payButtonText}>Payer maintenant</Text>
                  <MaterialIcons name="arrow-forward" size={22} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tokenText: {
    color: '#FF9500',
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#3A3A3C',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 5,
  },
  listContent: {
    paddingBottom: 120,
  },
  listHeader: {
    height: 10,
  },
  itemContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    color: '#FF9500',
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    padding: 16,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  pointsText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FF9500',
  },
  payButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#FFC87D',
  },
  payButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
});
