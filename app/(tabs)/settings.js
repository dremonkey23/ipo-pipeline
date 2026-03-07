import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Linking, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { isLoggedIn, getMe, logout } from '../../services/auth';
import { useRouter } from 'expo-router';

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

function EducationCard({ item, isExpanded, onToggle }) {
  const animatedHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  return (
    <TouchableOpacity
      style={[styles.eduCard, { borderLeftColor: item.color }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.eduCardHeader}>
        <View style={[styles.eduIconWrap, { backgroundColor: item.color + '18' }]}>
          <Ionicons name={item.icon} size={18} color={item.color} />
        </View>
        <Text style={styles.eduCardTitle}>{item.title}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </View>
      {isExpanded && (
        <Text style={styles.eduCardContent}>{item.content}</Text>
      )}
    </TouchableOpacity>
  );
}

function WhyTrackEarlySection() {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [showExample, setShowExample] = useState(false);

  return (
    <View>
      <View style={styles.eduHeader}>
        <View style={styles.eduHeaderIcon}>
          <Ionicons name="bulb" size={22} color={colors.yellow} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eduHeaderTitle}>Why Track IPOs Early?</Text>
          <Text style={styles.eduHeaderSubtitle}>
            The strategic advantage of early IPO intelligence
          </Text>
        </View>
      </View>

      <View style={styles.eduIntro}>
        <Text style={styles.eduIntroText}>
          Most investors hear about IPOs on listing day — often too late to make informed decisions. 
          Tracking the pipeline from S-1 filing gives you a{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }}>months-long head start</Text>.
        </Text>
      </View>

      {EDUCATION_ITEMS.map((item, idx) => (
        <EducationCard
          key={idx}
          item={item}
          isExpanded={expandedIndex === idx}
          onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
        />
      ))}

      {/* Real-world example */}
      <TouchableOpacity
        style={styles.exampleBox}
        onPress={() => setShowExample(!showExample)}
        activeOpacity={0.8}
      >
        <View style={styles.exampleHeader}>
          <Ionicons name="flash" size={16} color={colors.green} />
          <Text style={styles.exampleHeaderText}>See It In Action</Text>
          <Ionicons
            name={showExample ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textMuted}
          />
        </View>
        {showExample && (
          <View style={styles.exampleContent}>
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.timelineText}>
                <Text style={{ fontWeight: '700', color: colors.primary }}>Feb:</Text>{' '}
                See MedTech Inc files S-1
              </Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, { backgroundColor: colors.secondary }]} />
              <Text style={styles.timelineText}>
                <Text style={{ fontWeight: '700', color: colors.secondary }}>Feb–Jul:</Text>{' '}
                6 months to research financials, market, competitors
              </Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, { backgroundColor: colors.orange }]} />
              <Text style={styles.timelineText}>
                <Text style={{ fontWeight: '700', color: colors.orange }}>Jul:</Text>{' '}
                Know August listing date → prepare $10K investment
              </Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, { backgroundColor: colors.green }]} />
              <Text style={styles.timelineText}>
                <Text style={{ fontWeight: '700', color: colors.green }}>Aug:</Text>{' '}
                Ready to buy on Day 1 — informed and prepared
              </Text>
            </View>
            <View style={styles.exampleVs}>
              <Text style={styles.exampleVsText}>
                vs. hearing about it on CNBC 2 weeks later
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Value prop */}
      <View style={styles.valueProp}>
        <Ionicons name="diamond" size={16} color={colors.secondary} />
        <Text style={styles.valuePropText}>
          IPO Pipeline transforms raw SEC data into strategic investment intelligence — 
          giving you the preparation time that separates informed investors from the crowd.
        </Text>
      </View>
    </View>
  );
}

function SettingRow({ icon, title, subtitle, onPress, trailing }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {trailing || <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const li = await isLoggedIn();
    setLoggedIn(li);
    if (li) {
      const me = await getMe();
      setUser(me);
    }
  }

  const handleLogout = async () => {
    await logout();
    if (global.__ipoPipelineLogout) await global.__ipoPipelineLogout();
    setUser(null);
    setLoggedIn(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
      </View>

      {/* Account */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      {loggedIn && user ? (
        <>
          <SettingRow icon="person" title={user.email} subtitle={`Plan: ${user.plan === 'premium' ? 'Premium' : 'Free'}`} />
          {user.plan === 'free' && (
            <SettingRow 
              icon="diamond" 
              title="Upgrade to Premium"
              subtitle="$14.99/mo — Deep analysis, unlimited alerts"
              onPress={() => {}}
            />
          )}
          <SettingRow icon="log-out" title="Sign Out" onPress={handleLogout} />
        </>
      ) : (
        <SettingRow 
          icon="log-in" 
          title="Sign In / Register"
          subtitle="Track watchlist and get personalized alerts"
          onPress={() => router.push('/(tabs)/login')}
        />
      )}

      {/* Notifications */}
      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <SettingRow icon="rocket" title="New S-1 Filings" subtitle="Alert when a new IPO is filed" trailing={<Switch value={true} trackColor={{ true: colors.primary }} />} />
      <SettingRow icon="create" title="Amendments" subtitle="Price range and deal size changes" trailing={<Switch value={true} trackColor={{ true: colors.primary }} />} />
      <SettingRow icon="pricetag" title="IPO Pricing" subtitle="When IPOs are priced" trailing={<Switch value={true} trackColor={{ true: colors.primary }} />} />
      <SettingRow icon="trending-up" title="Listings" subtitle="When IPOs begin trading" trailing={<Switch value={true} trackColor={{ true: colors.primary }} />} />

      {/* About */}
      <Text style={styles.sectionLabel}>ABOUT</Text>
      <SettingRow icon="information-circle" title="About IPO Pipeline" subtitle="v1.0.0" />
      <SettingRow icon="shield-checkmark" title="Privacy Policy" onPress={() => Linking.openURL('https://ipo-pipeline.onrender.com/privacy')} />
      <SettingRow icon="document-text" title="Terms of Service" onPress={() => Linking.openURL('https://ipo-pipeline.onrender.com/terms')} />
      <SettingRow icon="mail" title="Contact Support" onPress={() => Linking.openURL('mailto:support@mirzayanllc.com')} />

      {/* Data Sources */}
      <Text style={styles.sectionLabel}>DATA</Text>
      <SettingRow icon="globe" title="SEC EDGAR" subtitle="S-1, S-1/A, F-1, 424B4 filings" onPress={() => Linking.openURL('https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=S-1&dateb=&owner=include&count=40')} />

      {/* Investment Education */}
      <Text style={styles.sectionLabel}>INVESTMENT EDUCATION</Text>
      <WhyTrackEarlySection />

      <View style={styles.footer}>
        <Text style={styles.footerText}>IPO Pipeline by Mirzayan LLC</Text>
        <Text style={styles.footerText}>Data sourced from SEC EDGAR</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.white },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, color: colors.white, fontWeight: '600' },
  settingSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  // Education section styles
  eduHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  eduHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.yellow + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eduHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
  },
  eduHeaderSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eduIntro: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  eduIntroText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  eduCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eduCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eduIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eduCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  eduCardContent: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
    paddingLeft: 40,
  },
  exampleBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.green + '08',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green + '25',
    padding: spacing.md,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exampleHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  exampleContent: {
    marginTop: spacing.md,
    paddingLeft: spacing.xs,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  timelineText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
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
    textAlign: 'center',
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.secondary + '0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondary + '20',
  },
  valuePropText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
