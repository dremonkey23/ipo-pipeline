import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Animated, Modal, ScrollView, Pressable, Platform, Dimensions, LayoutAnimation, UIManager } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, statusColors, statusLabels } from '../../constants/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Filter Configuration ─────────────────────────────────────
const FILTER_CONFIG = {
  dealSize: {
    label: 'Deal Size',
    icon: 'cash-outline',
    options: [
      { key: 'under50m', label: 'Under $50M', test: (ipo) => { const v = ipo.deal_size_high || ipo.deal_size_low; return v && v < 50e6; } },
      { key: '50m-500m', label: '$50M – $500M', test: (ipo) => { const v = ipo.deal_size_high || ipo.deal_size_low; return v && v >= 50e6 && v < 500e6; } },
      { key: '500m-1b', label: '$500M – $1B', test: (ipo) => { const v = ipo.deal_size_high || ipo.deal_size_low; return v && v >= 500e6 && v < 1e9; } },
      { key: 'over1b', label: 'Over $1B', test: (ipo) => { const v = ipo.deal_size_high || ipo.deal_size_low; return v && v >= 1e9; } },
      { key: 'deal_unknown', label: 'Unknown', test: (ipo) => !ipo.deal_size_high && !ipo.deal_size_low },
    ],
  },
  sector: {
    label: 'Sector',
    icon: 'business-outline',
    options: [
      { key: 'technology', label: 'Technology', test: (ipo) => /tech|software|saas|cloud|ai|data|cyber|semi/i.test(ipo.sector || ipo.industry || '') },
      { key: 'healthcare', label: 'Healthcare', test: (ipo) => /health|pharma|bio|medical|drug|thera/i.test(ipo.sector || ipo.industry || '') },
      { key: 'financial', label: 'Financial', test: (ipo) => /financ|bank|insur|fintech|capital/i.test(ipo.sector || ipo.industry || '') },
      { key: 'energy', label: 'Energy', test: (ipo) => /energy|oil|gas|solar|wind|power|clean/i.test(ipo.sector || ipo.industry || '') },
      { key: 'consumer', label: 'Consumer', test: (ipo) => /consumer|retail|food|beverage|apparel|e-commerce/i.test(ipo.sector || ipo.industry || '') },
      { key: 'industrial', label: 'Industrial', test: (ipo) => /industr|manufact|material|chemical|defense|aero/i.test(ipo.sector || ipo.industry || '') },
      { key: 'real_estate', label: 'Real Estate', test: (ipo) => /real estate|reit|property/i.test(ipo.sector || ipo.industry || '') },
      { key: 'sector_other', label: 'Other / Unknown', test: (ipo) => {
        const s = (ipo.sector || ipo.industry || '').toLowerCase();
        return !s || !(/tech|software|saas|cloud|ai|data|cyber|semi|health|pharma|bio|medical|drug|thera|financ|bank|insur|fintech|capital|energy|oil|gas|solar|wind|power|clean|consumer|retail|food|beverage|apparel|e-commerce|industr|manufact|material|chemical|defense|aero|real estate|reit|property/i.test(s));
      }},
    ],
  },
  exchange: {
    label: 'Exchange',
    icon: 'trending-up-outline',
    options: [
      { key: 'nasdaq', label: 'NASDAQ', test: (ipo) => /nasdaq/i.test(ipo.exchange || '') },
      { key: 'nyse', label: 'NYSE', test: (ipo) => /nyse|new york/i.test(ipo.exchange || '') },
      { key: 'exchange_other', label: 'Other / Unknown', test: (ipo) => !ipo.exchange || (!(/nasdaq/i.test(ipo.exchange)) && !(/nyse|new york/i.test(ipo.exchange))) },
    ],
  },
  priceRange: {
    label: 'Price Range',
    icon: 'pricetag-outline',
    options: [
      { key: 'under15', label: 'Under $15', test: (ipo) => { const p = ipo.price_range_high || ipo.final_price; return p && p < 15; } },
      { key: '15-25', label: '$15 – $25', test: (ipo) => { const p = ipo.price_range_high || ipo.final_price; return p && p >= 15 && p < 25; } },
      { key: '25-50', label: '$25 – $50', test: (ipo) => { const p = ipo.price_range_high || ipo.final_price; return p && p >= 25 && p < 50; } },
      { key: 'over50', label: 'Over $50', test: (ipo) => { const p = ipo.price_range_high || ipo.final_price; return p && p >= 50; } },
      { key: 'price_unknown', label: 'Unknown', test: (ipo) => !ipo.price_range_high && !ipo.final_price },
    ],
  },
  filingRecency: {
    label: 'Filing Recency',
    icon: 'calendar-outline',
    options: [
      { key: 'last_week', label: 'Last Week', test: (ipo) => {
        if (!ipo.latest_filing_date) return false;
        const d = new Date(ipo.latest_filing_date + 'T00:00:00');
        return (Date.now() - d.getTime()) <= 7 * 86400000;
      }},
      { key: 'last_month', label: 'Last Month', test: (ipo) => {
        if (!ipo.latest_filing_date) return false;
        const d = new Date(ipo.latest_filing_date + 'T00:00:00');
        return (Date.now() - d.getTime()) <= 30 * 86400000;
      }},
      { key: 'last_3months', label: 'Last 3 Months', test: (ipo) => {
        if (!ipo.latest_filing_date) return false;
        const d = new Date(ipo.latest_filing_date + 'T00:00:00');
        return (Date.now() - d.getTime()) <= 90 * 86400000;
      }},
      { key: 'older', label: 'Older', test: (ipo) => {
        if (!ipo.latest_filing_date) return true;
        const d = new Date(ipo.latest_filing_date + 'T00:00:00');
        return (Date.now() - d.getTime()) > 90 * 86400000;
      }},
    ],
  },
  companyStage: {
    label: 'Company Stage',
    icon: 'rocket-outline',
    options: [
      { key: 'profitable', label: 'Profitable', test: (ipo) => ipo.net_income != null && ipo.net_income > 0 },
      { key: 'revenue_growth', label: 'Revenue Growth', test: (ipo) => ipo.revenue_growth != null && ipo.revenue_growth > 0 },
      { key: 'pre_revenue', label: 'Pre-Revenue', test: (ipo) => !ipo.revenue_latest || ipo.revenue_latest === 0 },
      { key: 'stage_unknown', label: 'Unknown', test: (ipo) => ipo.net_income == null && ipo.revenue_growth == null && (ipo.revenue_latest == null || ipo.revenue_latest === undefined) },
    ],
  },
  geography: {
    label: 'Geography',
    icon: 'globe-outline',
    options: [
      { key: 'us', label: 'United States', test: (ipo) => {
        const h = (ipo.headquarters || '').toLowerCase();
        // US states or common US patterns
        return /\b(us|usa|united states|u\.s\.|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|, [a-z]{2}$)\b/i.test(h) || (!h);
      }},
      { key: 'international', label: 'International', test: (ipo) => {
        const h = (ipo.headquarters || '').toLowerCase();
        if (!h) return false;
        return !/\b(us|usa|united states|u\.s\.|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|, [a-z]{2}$)\b/i.test(h);
      }},
    ],
  },
};

const FILTER_KEYS = Object.keys(FILTER_CONFIG);

// ─── IPO Stage Info ────────────────────────────────────────
const IPO_STAGE_INFO = {
  filed: {
    icon: '📄',
    title: 'S-1 Filed',
    definition: 'The company has submitted its initial registration statement (Form S-1) to the Securities and Exchange Commission (SEC). This is the first official step toward going public.',
    timeline: 'Usually 2–6 months before listing',
    whyItMatters: 'This is the earliest signal that a company intends to IPO. Getting in early means you can research the company, analyze financials, and prepare before the general public pays attention.',
  },
  amended: {
    icon: '📝',
    title: 'Amended',
    definition: 'The company has filed an amendment to their original S-1. Amendments update pricing, share count, financial data, or risk factors — often in response to SEC feedback or market conditions.',
    timeline: 'Can happen multiple times over weeks or months',
    whyItMatters: 'Amendments reveal how the deal is evolving. A raised price range signals strong demand; a lowered range may indicate trouble. Each amendment gets you closer to the final terms.',
  },
  roadshow: {
    icon: '🎤',
    title: 'Roadshow',
    definition: 'Company executives are actively presenting to institutional investors (mutual funds, hedge funds, banks) to generate interest and gauge demand at various price levels.',
    timeline: 'Typically 1–2 weeks before pricing',
    whyItMatters: 'The roadshow is a strong indicator the IPO is imminent. Investor interest during this phase directly influences the final share price. This is your last window to do research before pricing.',
  },
  priced: {
    icon: '💰',
    title: 'Priced',
    definition: 'The final share price has been set and shares have been allocated to institutional investors. The company and underwriters have agreed on the exact terms of the offering.',
    timeline: 'Usually the evening before the first trading day',
    whyItMatters: 'Pricing above the initial range signals exceptional demand. Pricing below may signal weaker interest. The price-to-open gap on day one is where early opportunity — or risk — lives.',
  },
  listed: {
    icon: '🔔',
    title: 'Listed',
    definition: 'Shares are now actively trading on a public stock exchange (NYSE or NASDAQ). The company has completed the IPO process and is publicly traded.',
    timeline: 'Trading begins, usually the morning after pricing',
    whyItMatters: 'The stock is live. Watch the first-day pop (or drop) relative to the IPO price. Many investors wait for post-IPO volatility to settle before taking a position, typically 30–90 days.',
  },
};

// ─── Stage Info Modal ──────────────────────────────────────
function StageInfoModal({ visible, stage, onClose }) {
  if (!stage || !IPO_STAGE_INFO[stage]) return null;
  const info = IPO_STAGE_INFO[stage];
  const stageColor = statusColors[stage] || colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <View style={[styles.modalHeader, { borderBottomColor: stageColor + '40' }]}>
            <Text style={styles.modalIcon}>{info.icon}</Text>
            <Text style={[styles.modalTitle, { color: stageColor }]}>{info.title}</Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose} hitSlop={12}>
              <Ionicons name="close-circle" size={28} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionLabel}>What It Means</Text>
              <Text style={styles.modalSectionText}>{info.definition}</Text>
            </View>
            <View style={[styles.modalSection, styles.modalTimelineBox, { borderColor: stageColor + '30', backgroundColor: stageColor + '08' }]}>
              <View style={styles.modalTimelineRow}>
                <Ionicons name="time-outline" size={16} color={stageColor} />
                <Text style={[styles.modalTimelineLabel, { color: stageColor }]}>Timeline</Text>
              </View>
              <Text style={styles.modalSectionText}>{info.timeline}</Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionLabel}>Why It Matters for Investors</Text>
              <Text style={styles.modalSectionText}>{info.whyItMatters}</Text>
            </View>
          </ScrollView>
          <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: stageColor }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.modalCloseBtnText}>Got It</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
      <View style={styles.cardHeader}>
        <View style={styles.tickerRow}>
          <Text style={styles.companyName}>{ipo.company_name}</Text>
        </View>
        <Text style={styles.date}>{formatDate(ipo.latest_filing_date)}</Text>
      </View>
      <View style={styles.metaRow}>
        {ipo.ticker && <Text style={[styles.ticker, { color: colors.primary }]}>{ipo.ticker}</Text>}
        <StatusBadge status={ipo.status} />
        {hasAmendments && (
          <View style={styles.amendBadge}>
            <Text style={styles.amendBadgeText}>{ipo.amendment_count} amend.</Text>
          </View>
        )}
        {ipo.sector && <Text style={styles.sectorLabel}>{ipo.sector}</Text>}
      </View>
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
      {ipo.business_summary && (
        <Text style={styles.summaryTeaser} numberOfLines={2}>{ipo.business_summary}</Text>
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

// ─── Filter Panel Component ────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <View style={styles.filterChip}>
      <Text style={styles.filterChipText}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={8}>
        <Ionicons name="close-circle" size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function FilterSection({ filterKey, config, selectedOptions, onToggle, isExpanded, onToggleExpand }) {
  return (
    <View style={styles.filterSection}>
      <TouchableOpacity style={styles.filterSectionHeader} onPress={onToggleExpand} activeOpacity={0.7}>
        <View style={styles.filterSectionLeft}>
          <View style={[styles.filterSectionIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={config.icon} size={16} color={colors.primary} />
          </View>
          <Text style={styles.filterSectionTitle}>{config.label}</Text>
          {selectedOptions.length > 0 && (
            <View style={styles.filterSectionCount}>
              <Text style={styles.filterSectionCountText}>{selectedOptions.length}</Text>
            </View>
          )}
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.filterOptionsGrid}>
          {config.options.map(opt => {
            const isSelected = selectedOptions.includes(opt.key);
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.filterOption, isSelected && styles.filterOptionActive]}
                onPress={() => onToggle(filterKey, opt.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.filterCheckbox, isSelected && styles.filterCheckboxActive]}>
                  {isSelected && <Ionicons name="checkmark" size={12} color={colors.white} />}
                </View>
                <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function FilterPanel({ visible, filters, onToggleOption, onClearAll, onClose, activeCount }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [visible]);

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.filterPanel, {
      maxHeight: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }),
      opacity: slideAnim,
    }]}>
      {/* Filter panel header */}
      <View style={styles.filterPanelHeader}>
        <View style={styles.filterPanelHeaderLeft}>
          <Ionicons name="funnel" size={16} color={colors.primary} />
          <Text style={styles.filterPanelTitle}>Filters</Text>
          {activeCount > 0 && (
            <View style={styles.filterActiveCountBadge}>
              <Text style={styles.filterActiveCountText}>{activeCount} active</Text>
            </View>
          )}
        </View>
        <View style={styles.filterPanelHeaderRight}>
          {activeCount > 0 && (
            <TouchableOpacity onPress={onClearAll} style={styles.clearAllBtn} activeOpacity={0.7}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.filterScrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {FILTER_KEYS.map(key => (
          <FilterSection
            key={key}
            filterKey={key}
            config={FILTER_CONFIG[key]}
            selectedOptions={filters[key] || []}
            onToggle={onToggleOption}
            isExpanded={!!expandedSections[key]}
            onToggleExpand={() => toggleSection(key)}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// ─── Active Filter Chips Bar ───────────────────────────────
function ActiveFilterChips({ filters, onRemove }) {
  const chips = [];
  for (const [filterKey, selectedKeys] of Object.entries(filters)) {
    const config = FILTER_CONFIG[filterKey];
    if (!config) continue;
    for (const optKey of selectedKeys) {
      const opt = config.options.find(o => o.key === optKey);
      if (opt) {
        chips.push({ filterKey, optKey, label: `${config.label}: ${opt.label}` });
      }
    }
  }
  if (chips.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScrollView}
      contentContainerStyle={styles.chipsContainer}
    >
      {chips.map(chip => (
        <FilterChip
          key={`${chip.filterKey}-${chip.optKey}`}
          label={chip.label}
          onRemove={() => onRemove(chip.filterKey, chip.optKey)}
        />
      ))}
    </ScrollView>
  );
}

// ─── Education Items ───────────────────────────────────────
const EDUCATION_ITEMS = [
  {
    icon: 'search',
    title: 'Research & Preparation',
    color: colors.primary,
    content: 'When a company files its S-1, you get 2–6 months to study the business before media hype kicks in. Read the prospectus, analyze financials, understand the competitive landscape — all while most investors have no idea the IPO exists.',
  },
  {
    icon: 'calendar',
    title: 'IPO Day Strategy',
    color: colors.green,
    content: 'Knowing approximate listing dates lets you prepare your brokerage account, plan your position size, and set price alerts in advance. No scrambling on listing day — you\'ve already done the work.',
  },
  {
    icon: 'pie-chart',
    title: 'Portfolio Timing',
    color: colors.orange,
    content: 'Upcoming IPOs give you time to rebalance. Sell competing positions, free up cash, and avoid being caught off guard. Strategic portfolio management means better entries and fewer emotional decisions.',
  },
  {
    icon: 'analytics',
    title: 'Due Diligence',
    color: colors.secondary,
    content: 'Track price range changes across amendments, study revenue trends in SEC filings, and compare valuations to public competitors. Each S-1 amendment reveals new data points that sharpen your thesis.',
  },
  {
    icon: 'globe',
    title: 'Sector Intelligence',
    color: colors.yellow,
    content: 'Multiple filings in the same sector signal market trends. Compare valuations, spot saturation risk, and identify which IPOs represent genuine opportunity vs. late-cycle cash grabs.',
  },
];

function EducationModal({ visible, onClose }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [showExample, setShowExample] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { maxHeight: Dimensions.get('window').height * 0.85 }]} onPress={e => e.stopPropagation()}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.yellow + '40' }]}>
            <View style={styles.eduModalHeaderIcon}>
              <Ionicons name="bulb" size={24} color={colors.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.yellow }]}>Why Track IPOs Early?</Text>
              <Text style={styles.eduModalSubtitle}>The strategic advantage of early IPO intelligence</Text>
            </View>
            <TouchableOpacity style={styles.modalClose} onPress={onClose} hitSlop={12}>
              <Ionicons name="close-circle" size={28} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.eduIntroSection}>
              <Text style={styles.eduIntroText}>
                Most investors hear about IPOs on listing day — often too late to make informed decisions.
                Tracking the pipeline from S-1 filing gives you a{' '}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>months-long head start</Text>.
              </Text>
            </View>
            {EDUCATION_ITEMS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.eduCard, { borderLeftColor: item.color }]}
                onPress={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                activeOpacity={0.7}
              >
                <View style={styles.eduCardHeader}>
                  <View style={[styles.eduIconWrap, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.eduCardTitle}>{item.title}</Text>
                  <Ionicons name={expandedIndex === idx ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </View>
                {expandedIndex === idx && (
                  <Text style={styles.eduCardContent}>{item.content}</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.exampleBox} onPress={() => setShowExample(!showExample)} activeOpacity={0.8}>
              <View style={styles.exampleHeader}>
                <Ionicons name="flash" size={16} color={colors.green} />
                <Text style={styles.exampleHeaderText}>See It In Action</Text>
                <Ionicons name={showExample ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
              </View>
              {showExample && (
                <View style={styles.exampleContent}>
                  <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.timelineText}>
                      <Text style={{ fontWeight: '700', color: colors.primary }}>Feb:</Text> See MedTech Inc files S-1
                    </Text>
                  </View>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.secondary }]} />
                    <Text style={styles.timelineText}>
                      <Text style={{ fontWeight: '700', color: colors.secondary }}>Feb–Jul:</Text> 6 months to research financials, market, competitors
                    </Text>
                  </View>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.orange }]} />
                    <Text style={styles.timelineText}>
                      <Text style={{ fontWeight: '700', color: colors.orange }}>Jul:</Text> Know August listing date → prepare $10K investment
                    </Text>
                  </View>
                  <View style={styles.timelineLine} />
                  <View style={styles.timelineStep}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.green }]} />
                    <Text style={styles.timelineText}>
                      <Text style={{ fontWeight: '700', color: colors.green }}>Aug:</Text> Ready to buy on Day 1 — informed and prepared
                    </Text>
                  </View>
                  <View style={styles.exampleVs}>
                    <Text style={styles.exampleVsText}>vs. hearing about it on CNBC 2 weeks later</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.valueProp}>
              <Ionicons name="diamond" size={16} color={colors.secondary} />
              <Text style={styles.valuePropText}>
                IPO Pipeline transforms raw SEC data into strategic investment intelligence —
                giving you the preparation time that separates informed investors from the crowd.
              </Text>
            </View>
          </ScrollView>
          <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.yellow }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={[styles.modalCloseBtnText, { color: colors.bg }]}>Got It</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────
export default function PipelineScreen() {
  const router = useRouter();
  const [ipos, setIPOs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [infoModalStage, setInfoModalStage] = useState(null);
  const [showEducation, setShowEducation] = useState(false);

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});  // { dealSize: ['under50m'], sector: ['technology'], ... }

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

  // ─── Filter Logic ──────────────────────────────────────
  const toggleFilterOption = useCallback((filterKey, optionKey) => {
    setFilters(prev => {
      const current = prev[filterKey] || [];
      const updated = current.includes(optionKey)
        ? current.filter(k => k !== optionKey)
        : [...current, optionKey];
      const newFilters = { ...prev };
      if (updated.length === 0) {
        delete newFilters[filterKey];
      } else {
        newFilters[filterKey] = updated;
      }
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);
  }, [filters]);

  // Apply client-side filters
  const filteredIPOs = useMemo(() => {
    if (activeFilterCount === 0) return ipos;

    return ipos.filter(ipo => {
      // For each filter category with selections, the IPO must match at least one selected option (OR within category)
      // Across categories, all must pass (AND across categories)
      for (const [filterKey, selectedKeys] of Object.entries(filters)) {
        const config = FILTER_CONFIG[filterKey];
        if (!config || selectedKeys.length === 0) continue;

        const matchesAny = selectedKeys.some(optKey => {
          const opt = config.options.find(o => o.key === optKey);
          return opt && opt.test(ipo);
        });

        if (!matchesAny) return false;
      }
      return true;
    });
  }, [ipos, filters, activeFilterCount]);

  const statusFilters = [null, 'filed', 'amended', 'roadshow', 'priced', 'listed'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>🚀 IPO Pipeline</Text>
          <View style={styles.headerActions}>
            {/* Filter toggle button */}
            <TouchableOpacity
              style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
              onPress={() => setShowFilters(!showFilters)}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={16} color={showFilters ? colors.white : colors.primary} />
              <Text style={[styles.filterToggleBtnText, showFilters && styles.filterToggleBtnTextActive]}>
                Filters
              </Text>
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Why Track button */}
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowEducation(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="bulb" size={18} color={colors.yellow} />
              <Text style={styles.helpButtonText}>Why Track?</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Track S-1 filings before they go public</Text>
      </View>

      {/* Education Modal */}
      <EducationModal visible={showEducation} onClose={() => setShowEducation(false)} />

      {/* Stats */}
      <StatsHeader stats={stats} />

      {/* Advanced Filter Panel */}
      <FilterPanel
        visible={showFilters}
        filters={filters}
        onToggleOption={toggleFilterOption}
        onClearAll={clearAllFilters}
        onClose={() => setShowFilters(false)}
        activeCount={activeFilterCount}
      />

      {/* Active Filter Chips */}
      <ActiveFilterChips filters={filters} onRemove={toggleFilterOption} />

      {/* Status filter tabs */}
      <View style={styles.filterRow}>
        {statusFilters.map(s => (
          <View key={s || 'all'} style={styles.filterTabWrapper}>
            <TouchableOpacity
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
            {s && IPO_STAGE_INFO[s] && (
              <TouchableOpacity
                style={styles.infoIcon}
                onPress={() => setInfoModalStage(s)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="information-circle-outline" size={15} color={statusColors[s] || colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Stage Info Modal */}
      <StageInfoModal visible={!!infoModalStage} stage={infoModalStage} onClose={() => setInfoModalStage(null)} />

      {/* Results count when filtering */}
      {activeFilterCount > 0 && !loading && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>{filteredIPOs.length}</Text>
            <Text> of {ipos.length} IPOs match your filters</Text>
          </Text>
        </View>
      )}

      {/* IPO List */}
      {loading ? (
        <View style={{ padding: spacing.md }}>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filteredIPOs}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <IPOCard
              ipo={item}
              onPress={() => router.push({ pathname: '/(tabs)/ipo-detail', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name={activeFilterCount > 0 ? 'funnel-outline' : 'rocket-outline'} size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {activeFilterCount > 0 ? 'No matches found' : 'No IPOs found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeFilterCount > 0
                  ? 'Try adjusting your filters to see more results'
                  : 'Check back later for new filings'}
              </Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.emptyClearBtn} onPress={clearAllFilters} activeOpacity={0.7}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={styles.emptyClearText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Filter toggle button
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    marginRight: 8,
  },
  filterToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 5,
  },
  filterToggleBtnTextActive: {
    color: colors.white,
  },
  filterBadge: {
    backgroundColor: colors.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 5,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.yellow + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.yellow + '30',
  },
  helpButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.yellow,
    marginLeft: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // ─── Filter Panel Styles ─────────────────────────────────
  filterPanel: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    overflow: 'hidden',
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPanelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPanelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterPanelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  filterActiveCountBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  filterActiveCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.red + '15',
    borderWidth: 1,
    borderColor: colors.red + '30',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.red,
  },
  filterScrollView: {
    maxHeight: 400,
  },
  filterSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  filterSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterSectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterSectionCount: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterSectionCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  filterOptionActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary + '50',
  },
  filterCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // ─── Filter Chips ────────────────────────────────────────
  chipsScrollView: {
    maxHeight: 40,
    marginBottom: spacing.xs,
  },
  chipsContainer: {
    paddingHorizontal: spacing.md,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  filterChipText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },

  // ─── Results Bar ─────────────────────────────────────────
  resultsBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  resultsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // ─── Empty state with filter context ─────────────────────
  emptyClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: 6,
  },
  emptyClearText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // ─── Stats ───────────────────────────────────────────────
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

  // ─── Status Tabs ─────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterTabWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIcon: {
    marginLeft: 2,
    padding: 2,
    opacity: 0.7,
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

  // ─── Cards ───────────────────────────────────────────────
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

  // ─── Empty State ─────────────────────────────────────────
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
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  // ─── Modals ──────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: Dimensions.get('window').height * 0.75,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalIcon: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  modalSectionText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  modalTimelineBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  modalTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  modalTimelineLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalCloseBtn: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  // ─── Education Modal ─────────────────────────────────────
  eduModalHeaderIcon: {
    marginRight: spacing.sm,
  },
  eduModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eduIntroSection: {
    marginBottom: spacing.lg,
  },
  eduIntroText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  eduCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eduCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eduIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eduCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  eduCardContent: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  exampleBox: {
    backgroundColor: colors.green + '08',
    borderWidth: 1,
    borderColor: colors.green + '25',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exampleHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
    flex: 1,
  },
  exampleContent: {
    marginTop: spacing.md,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 4,
  },
  exampleVs: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exampleVsText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  valueProp: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: spacing.md,
  },
  valuePropText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
});
