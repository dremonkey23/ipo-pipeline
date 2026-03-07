import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { getAlerts, markAlertRead, markAllAlertsRead } from '../../services/api';

const alertIcons = {
  new_filing: 'rocket',
  amendment: 'create',
  pricing_update: 'pricetag',
  deal_size_change: 'trending-up',
  roadshow: 'airplane',
  listing: 'checkmark-circle',
  withdrawal: 'close-circle',
  lockup_expiry: 'lock-open',
};

const severityColors = {
  high: colors.red,
  medium: colors.yellow,
  low: colors.textSecondary,
};

function AlertCard({ alert, onPress }) {
  const icon = alertIcons[alert.alert_type] || 'notifications';
  const sevColor = severityColors[alert.severity] || colors.textSecondary;
  const isUnread = !alert.is_read;

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: sevColor + '20' }]}>
        <Ionicons name={icon} size={20} color={sevColor} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isUnread && { color: colors.white }]} numberOfLines={1}>
            {alert.title}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.cardMessage} numberOfLines={2}>{alert.message}</Text>
        <View style={styles.cardFooter}>
          {alert.company_name && (
            <Text style={styles.companyTag}>{alert.ticker || alert.company_name}</Text>
          )}
          <Text style={styles.timestamp}>
            {new Date(alert.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await getAlerts({ limit: 50 });
      setAlerts(data.data || []);
    } catch (err) {
      console.error('Alerts error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAlerts(); }, [loadAlerts]));

  const handlePress = async (alert) => {
    if (!alert.is_read) {
      try {
        await markAlertRead(alert.id);
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_read: 1 } : a));
      } catch (e) {}
    }
    if (alert.company_id) {
      router.push({ pathname: '/(tabs)/ipo-detail', params: { id: alert.company_id } });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsRead();
      setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })));
    } catch (e) {}
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔔 Alerts</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllRead}>Mark all read ({unreadCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <AlertCard alert={item} onPress={() => handlePress(item)} />}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAlerts(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No alerts yet</Text>
              <Text style={styles.emptySubtext}>You'll be notified of new filings and updates</Text>
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
  markAllRead: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  cardMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  companyTag: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.md },
  emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
});
