import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, statusColors, statusLabels } from '../../constants/theme';
import { getIPOs, getIPOStats } from '../../services/api';

function formatValue(val) {
  if (!val && val !== 0) return 'TBD';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function StatusBadge({ status }) {
  const color = statusColors[status] || colors.textMuted;
  const label = statusLabels[status] || status;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={{ width: 120, height: 20, backgroundColor: colors.surface, borderRadius: 4, marginBottom: 8 }} />
      <View style={{ width: 200, height: 14, backgroundColor: colors.surface, borderRadius: 4, marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: 80, height: 16, backgroundColor: colors.surface, borderRadius: 4 }} />
        <View style={{ width: 60, height: 16, backgroundColor: colors.surface, borderRadius: 4 }} />
      </View>
    </Animated.View>
  );
}

function IPOCard({ ipo, onPress }) {
  const statusColor = statusColors[ipo.status] || colors.textMuted;
  const hasAmendments = ipo.amendment_count > 0;
  const revenueGrowth = ipo.revenue_growth;

  return (
    <TouchableOpacity 
      style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.tickerRow}>
          <Text style={styles.companyName}>{ipo.company_name}</Text>
        </View>
        <Text style={styles.date}>{formatDate(ipo.latest_filing_date)}</Text>
      </View>

      {/* Status & Ticker */}
      <View style={styles.metaRow}>
        {ipo.ticker && (
          <Text style={[styles.ticker, { color: colors.primary }]}>{ipo.ticker}</Text>
        )}
        <StatusBadge status={ipo.status} />
        {hasAmendments && (
          <View style={[styles.amendBadge]}>
            <Text style={styles.amendBadgeText}>{ipo.amendment_count} amend.</Text>
          </View>
        )}
        {ipo.sector && (
          <Text style={styles.sectorLabel}>{ipo.sector}</Text>
        )}
      </View>

      {/* Financial summary */}
      <View style={styles.cardBody}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Price Range</Text>
          <Text style={styles.metricValue}>{ipo.price_range_display || 'TBD'}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Deal Size</Text>
          <Text style={styles.metricValue}>{ipo.deal_size_display || 'TBD'}</Text>
        </View>
        {revenueGrowth != null && (
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Rev Growth</Text>
            <Text style={[styles.metricValue, { color: revenueGrowth > 0 ? colors.green : colors.red }]}>
              {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>

      {/* Business summary teaser */}
      {ipo.business_summary && (
        <Text style={styles.summaryTeaser} numberOfLines={2}>
          {ipo.business_summary}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function StatsHeader({ stats }) {
  if (!stats) return null;
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{stats.active_filings || 0}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{stats.priced_this_month || 0}</Text>
        <Text style={styles.statLabel}>Priced</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{stats.listed_this_month || 0}</Text>
        <Text style={styles.statLabel}>Listed</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{stats.amendments_this_week || 0}</Text>
        <Text style={styles.statLabel}>Amend.</Text>
      </View>
    </View>
  );
}

export default function PipelineScreen() {
  const router = useRouter();
  const [ipos, setIPOs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [ipoData, statsData] = await Promise.all([
        getIPOs(params),
        getIPOStats(),
      ]);
      setIPOs(ipoData.data || []);
      setStats(statsData);
    } catch (err) {
      console.error('Load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const statusFilters = [null, 'filed', 'amended', 'roadshow', 'priced', 'listed'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚀 IPO Pipeline</Text>
        <Text style={styles.headerSubtitle}>Track S-1 filings before they go public</Text>
      </View>

      {/* Stats */}
      <StatsHeader stats={stats} />

      {/* Status filter tabs */}
      <View style={styles.filterRow}>
        {statusFilters.map(s => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.filterTab, statusFilter === s && styles.filterTabActive]}
            onPress={() => { setStatusFilter(s); setLoading(true); }}
          >
            <Text style={[
              styles.filterTabText,
              statusFilter === s && styles.filterTabTextActive,
              s && { color: statusColors[s] },
            ]}>
              {s ? statusLabels[s] : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* IPO List */}
      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={ipos}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <IPOCard
              ipo={item}
              onPress={() => router.push({ pathname: '/(tabs)/ipo-detail', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="rocket-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No IPOs found</Text>
              <Text style={styles.emptySubtext}>Check back later for new filings</Text>
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
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  ticker: {
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.yellow + '20',
  },
  amendBadgeText: {
    fontSize: 10,
    color: colors.yellow,
    fontWeight: '600',
  },
  sectorLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardBody: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  summaryTeaser: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
