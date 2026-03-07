import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, statusColors, statusLabels } from '../../constants/theme';
import { getIPODetail, addToWatchlist, removeFromWatchlist } from '../../services/api';

function formatValue(val) {
  if (!val && val !== 0) return 'N/A';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function Section({ title, icon, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
    </View>
  );
}

function TimelineItem({ event, isLast }) {
  const typeIcons = {
    initial_filing: 'document-text',
    amendment: 'create',
    roadshow_start: 'airplane',
    roadshow_end: 'flag',
    pricing: 'pricetag',
    listing: 'trending-up',
    first_trade: 'flash',
    lockup_expiry: 'lock-open',
    withdrawn: 'close-circle',
    confidential_filing: 'eye-off',
  };

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot}>
        <Ionicons name={typeIcons[event.event_type] || 'ellipse'} size={16} color={colors.primary} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineDate}>{formatDate(event.event_date)}</Text>
        <Text style={styles.timelineDesc}>{event.description}</Text>
      </View>
    </View>
  );
}

export default function IPODetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadDetail();
  }, [id]);

  async function loadDetail() {
    try {
      const detail = await getIPODetail(id);
      setData(detail);
    } catch (err) {
      console.error('Load error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleWatchlist() {
    try {
      if (isWatched) {
        await removeFromWatchlist(id);
      } else {
        await addToWatchlist(id);
      }
      setIsWatched(!isWatched);
    } catch (err) {
      console.error('Watchlist error:', err.message);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>IPO not found</Text>
      </View>
    );
  }

  const { company, filings, timeline, insiders } = data;
  const latestFiling = filings && filings.length > 0 ? filings[0] : {};
  const statusColor = statusColors[company.status] || colors.textMuted;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color={colors.white} />
      </TouchableOpacity>

      {/* Company header */}
      <View style={styles.companyHeader}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.companyName}>{company.company_name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {company.ticker && <Text style={styles.ticker}>{company.ticker}</Text>}
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusLabels[company.status] || company.status}
                </Text>
              </View>
              {company.exchange && <Text style={styles.exchange}>{company.exchange}</Text>}
            </View>
          </View>
          <TouchableOpacity onPress={toggleWatchlist} style={styles.watchBtn}>
            <Ionicons 
              name={isWatched ? 'eye' : 'eye-outline'} 
              size={24} 
              color={isWatched ? colors.primary : colors.textMuted} 
            />
          </TouchableOpacity>
        </View>

        {company.description && (
          <Text style={styles.description}>{company.description}</Text>
        )}

        <View style={styles.companyMeta}>
          {company.headquarters && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{company.headquarters}</Text>
            </View>
          )}
          {company.sector && (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{company.sector}</Text>
            </View>
          )}
          {company.employees && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{company.employees.toLocaleString()} employees</Text>
            </View>
          )}
        </View>
      </View>

      {/* Offering Details */}
      <Section title="Offering Details" icon="cash-outline">
        <MetricRow label="Price Range" value={company.price_range_display || 'TBD'} />
        <MetricRow label="Deal Size" value={company.deal_size_display || 'TBD'} />
        {latestFiling.shares_offered && (
          <MetricRow label="Shares Offered" value={latestFiling.shares_offered.toLocaleString()} />
        )}
        {latestFiling.final_price && (
          <MetricRow label="Final Price" value={`$${latestFiling.final_price}`} color={colors.green} />
        )}
        {company.lead_underwriters && (
          <MetricRow label="Lead Underwriters" value={company.lead_underwriters} />
        )}
      </Section>

      {/* Financials */}
      {(latestFiling.revenue_latest || latestFiling.net_income) && (
        <Section title="Financials" icon="bar-chart-outline">
          {latestFiling.revenue_latest && (
            <MetricRow label="Revenue (Latest)" value={formatValue(latestFiling.revenue_latest)} />
          )}
          {latestFiling.revenue_prior && (
            <MetricRow label="Revenue (Prior)" value={formatValue(latestFiling.revenue_prior)} />
          )}
          {latestFiling.revenue_growth != null && (
            <MetricRow 
              label="Revenue Growth" 
              value={`${latestFiling.revenue_growth > 0 ? '+' : ''}${latestFiling.revenue_growth.toFixed(1)}%`}
              color={latestFiling.revenue_growth > 0 ? colors.green : colors.red}
            />
          )}
          {latestFiling.net_income != null && (
            <MetricRow 
              label="Net Income" 
              value={formatValue(Math.abs(latestFiling.net_income))}
              color={latestFiling.net_income >= 0 ? colors.green : colors.red}
            />
          )}
        </Section>
      )}

      {/* Filings */}
      {filings && filings.length > 0 && (
        <Section title={`SEC Filings (${filings.length})`} icon="document-text-outline">
          {filings.map((f, i) => (
            <TouchableOpacity 
              key={f.id || i}
              style={styles.filingItem}
              onPress={() => f.filing_url && Linking.openURL(f.filing_url)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.filingType}>{f.form_type}</Text>
                <Text style={styles.filingDate}>{formatDate(f.filing_date)}</Text>
                {f.change_summary && (
                  <Text style={styles.changeSummary}>{f.change_summary}</Text>
                )}
              </View>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Section>
      )}

      {/* Insider Ownership */}
      {insiders && insiders.length > 0 && (
        <Section title="Insider Ownership" icon="people-outline">
          {insiders.map((ins, i) => (
            <View key={ins.id || i} style={styles.insiderItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.insiderName}>{ins.insider_name}</Text>
                <Text style={styles.insiderTitle}>{ins.title}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.insiderPct}>
                  {ins.percent_before_ipo?.toFixed(1)}% → {ins.percent_after_ipo?.toFixed(1)}%
                </Text>
                <Text style={styles.insiderShares}>
                  {ins.shares_before_ipo?.toLocaleString()} shares
                </Text>
              </View>
            </View>
          ))}
        </Section>
      )}

      {/* Timeline */}
      {timeline && timeline.length > 0 && (
        <Section title="Timeline" icon="time-outline">
          {timeline.map((event, i) => (
            <TimelineItem key={event.id || i} event={event} isLast={i === timeline.length - 1} />
          ))}
        </Section>
      )}

      {/* Business Summary */}
      {latestFiling.business_summary && (
        <Section title="Business Overview" icon="information-circle-outline">
          <Text style={styles.bodyText}>{latestFiling.business_summary}</Text>
        </Section>
      )}

      {/* Risk Factors */}
      {latestFiling.risk_factors_summary && (
        <Section title="Key Risks" icon="warning-outline">
          <Text style={styles.bodyText}>{latestFiling.risk_factors_summary}</Text>
        </Section>
      )}

      {/* Use of Proceeds */}
      {latestFiling.use_of_proceeds && (
        <Section title="Use of Proceeds" icon="wallet-outline">
          <Text style={styles.bodyText}>{latestFiling.use_of_proceeds}</Text>
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyHeader: {
    padding: spacing.lg,
    paddingTop: 90,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
  },
  ticker: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  exchange: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  watchBtn: {
    padding: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  companyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  filingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  filingType: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  filingDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeSummary: {
    fontSize: 12,
    color: colors.yellow,
    marginTop: 4,
  },
  insiderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  insiderName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  insiderTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  insiderPct: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  insiderShares: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  timelineDot: {
    width: 30,
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.sm,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  timelineDesc: {
    fontSize: 13,
    color: colors.white,
    marginTop: 2,
  },
  bodyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
