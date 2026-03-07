import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, statusColors, statusLabels } from '../../constants/theme';
import { getWatchlist, removeFromWatchlist } from '../../services/api';
import { isLoggedIn } from '../../services/auth';

function WatchlistCard({ item, onPress, onRemove }) {
  const statusColor = statusColors[item.status] || colors.textMuted;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <View style={styles.cardHeader}>
          <Text style={styles.companyName}>{item.company_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabels[item.status] || item.status}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          {item.ticker && <Text style={styles.ticker}>{item.ticker}</Text>}
          {item.sector && <Text style={styles.sector}>{item.sector}</Text>}
          <Text style={styles.filingCount}>{item.filing_count || 0} filings</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price Range:</Text>
          <Text style={styles.priceValue}>
            {item.price_range_low && item.price_range_high 
              ? `$${item.price_range_low} - $${item.price_range_high}` 
              : 'TBD'}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={22} color={colors.red + '80'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function WatchlistScreen() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggedIn, setLoggedIn] = useState(null);

  const loadWatchlist = useCallback(async () => {
    try {
      const li = await isLoggedIn();
      setLoggedIn(li);
      if (!li) { setLoading(false); return; }
      const data = await getWatchlist();
      setItems(data.data || []);
    } catch (err) {
      console.error('Watchlist error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadWatchlist(); }, [loadWatchlist]));

  const handleRemove = async (companyId) => {
    try {
      await removeFromWatchlist(companyId);
      setItems(prev => prev.filter(i => i.id !== companyId));
    } catch (e) {}
  };

  if (loggedIn === false) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="eye-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>Sign in to track IPOs</Text>
        <TouchableOpacity 
          style={styles.signInBtn}
          onPress={() => router.push('/(tabs)/login')}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👁️ Watchlist</Text>
        <Text style={styles.headerCount}>{items.length} IPOs</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <WatchlistCard
              item={item}
              onPress={() => router.push({ pathname: '/(tabs)/ipo-detail', params: { id: item.id } })}
              onRemove={() => handleRemove(item.id)}
            />
          )}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWatchlist(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="eye-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No IPOs watched yet</Text>
              <Text style={styles.emptySubtext}>Tap the eye icon on any IPO to add it here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.white },
  headerCount: { fontSize: 14, color: colors.textSecondary },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  companyName: { fontSize: 15, fontWeight: '700', color: colors.white, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  ticker: { fontSize: 13, fontWeight: '800', color: colors.primary },
  sector: { fontSize: 12, color: colors.textSecondary },
  filingCount: { fontSize: 12, color: colors.textMuted },
  priceRow: { flexDirection: 'row', gap: 8 },
  priceLabel: { fontSize: 12, color: colors.textMuted },
  priceValue: { fontSize: 12, fontWeight: '600', color: colors.white },
  removeBtn: { padding: 4, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.md },
  emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  signInBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
